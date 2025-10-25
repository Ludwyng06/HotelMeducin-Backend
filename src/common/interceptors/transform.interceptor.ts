import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TransformInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const startTime = Date.now();
    const { method, url, body } = request;
    const userAgent = request.get('User-Agent') || '';

    // Log de la petición entrante
    this.logger.log(`📥 ${method} ${url} - Iniciando procesamiento`);

    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Log de la respuesta
        this.logger.log(
          `📤 ${method} ${url} - Completado en ${duration}ms - Status: ${response.statusCode}`,
        );
      }),
      map((data) => {
        // Transformar la respuesta a formato estándar
        if (data && typeof data === 'object') {
          // Si ya tiene formato estándar, no transformar
          if (data.success !== undefined) {
            return data;
          }
          
          // Transformar a formato estándar
          return {
            success: true,
            data: data,
            timestamp: new Date().toISOString(),
            path: url,
            method: method,
          };
        }
        
        return {
          success: true,
          data: data,
          timestamp: new Date().toISOString(),
          path: url,
          method: method,
        };
      }),
    );
  }
}
