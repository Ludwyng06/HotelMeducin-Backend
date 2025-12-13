import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { Types } from 'mongoose';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorInterceptor.name);
  private readonly TIMEOUT_MS = 30000; // 30 segundos

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      // Timeout para operaciones que tardan demasiado
      timeout(this.TIMEOUT_MS),
      catchError((error) => {
        // Manejar errores de timeout
        if (error instanceof TimeoutError) {
          this.logger.error(`Timeout en ${context.getHandler().name}`);
          return throwError(() => new BadRequestException('La operación excedió el tiempo límite'));
        }

        // Manejar errores de validación de ObjectId
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
          const invalidId = error.value;
          this.logger.warn(`ObjectId inválido: ${invalidId}`);
          return throwError(() => new BadRequestException(`ID inválido: ${invalidId}`));
        }

        // Re-lanzar otros errores
        return throwError(() => error);
      }),
    );
  }

  /**
   * Validar si un string es un ObjectId válido de MongoDB
   */
  static isValidObjectId(id: string): boolean {
    if (!id || typeof id !== 'string') {
      return false;
    }
    return Types.ObjectId.isValid(id);
  }
}

