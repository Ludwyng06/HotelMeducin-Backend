import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a este recurso. Se requiere autenticación.'
      );
    }
    
    const userRole = user.role || 'user';
    
    // Verificar si el rol del usuario está en los roles requeridos
    const hasRequiredRole = requiredRoles.includes(userRole);
    
    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `No tienes permisos para acceder a este recurso. Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}. Tu rol actual: ${userRole}`
      );
    }
    
    return true;
  }
}