import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';
import { Error as MongooseError } from 'mongoose';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | object;
    let error: string;
    let details: any = null;

    // Manejar errores de MongoDB
    if (exception instanceof MongoError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'MongoDB Error';
      
      switch (exception.code) {
        case 11000: // Duplicate key
          message = 'El registro ya existe en la base de datos';
          details = {
            field: Object.keys((exception as any).keyPattern || {})[0],
            value: (exception as any).keyValue,
          };
          break;
        case 11001: // Duplicate key (alternativo)
          message = 'Error de duplicado en la base de datos';
          break;
        default:
          message = 'Error en la base de datos';
          this.logger.error(`MongoDB Error: ${exception.message}`, exception.stack);
      }
    }
    // Manejar errores de Mongoose
    else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Validation Error';
      message = `Valor inválido para el campo: ${exception.path}`;
      details = {
        field: exception.path,
        value: exception.value,
        kind: exception.kind,
      };
    }
    else if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Validation Error';
      message = 'Error de validación en los datos';
      details = Object.keys(exception.errors).map(key => ({
        field: key,
        message: exception.errors[key].message,
      }));
    }
    // Manejar errores HTTP de NestJS
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
        details = (exceptionResponse as any).details || null;
      }
    }
    // Manejar errores de validación de class-validator
    else if ((exception as any).response?.statusCode === HttpStatus.BAD_REQUEST) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Validation Error';
      message = (exception as any).response?.message || 'Error de validación';
      details = (exception as any).response?.message;
    }
    // Manejar errores de tamaño de payload
    else if ((exception as any).type === 'entity.too.large') {
      status = HttpStatus.PAYLOAD_TOO_LARGE;
      error = 'Payload Too Large';
      message = 'El tamaño de la petición excede el límite permitido';
    }
    // Manejar errores de timeout
    else if ((exception as any).code === 'ETIMEDOUT' || (exception as any).code === 'ECONNRESET') {
      status = HttpStatus.REQUEST_TIMEOUT;
      error = 'Request Timeout';
      message = 'La petición excedió el tiempo límite';
    }
    // Error no controlado
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor' 
        : (exception as Error)?.message || 'Error desconocido';
      error = 'Internal Server Error';
      
      // Log del error no controlado
      this.logger.error(
        `Error no controlado: ${exception}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Log del error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Respuesta estandarizada
    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: error,
      message: message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    // Asegurar que los headers CORS estén presentes en las respuestas de error
    const origin = request.headers.origin;
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('::1'))) {
      response.header('Access-Control-Allow-Origin', origin);
      response.header('Access-Control-Allow-Credentials', 'true');
    }
    
    response.status(status).json(errorResponse);
  }
}
