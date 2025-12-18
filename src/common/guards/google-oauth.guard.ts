import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Verificar si Google OAuth está configurado
    const clientID = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    
    if (!clientID || !clientSecret || clientID === 'placeholder-not-configured' || clientSecret === 'placeholder-not-configured') {
      // Si no está configurado, lanzar una excepción apropiada
      throw new UnauthorizedException('Google OAuth no está configurado. GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET son requeridos. Verifica que estén en Backend/.env y reinicia el servidor.');
    }
    
    // Verificar si la estrategia 'google' está registrada en Passport
    try {
      const passport = require('passport');
      if (!passport._strategies || !passport._strategies.google) {
        throw new UnauthorizedException('Google OAuth strategy no está registrada. Reinicia el servidor después de configurar las credenciales en Backend/.env');
      }
    } catch (error: any) {
      // Si hay un error al verificar, lanzar excepción descriptiva
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Si es otro tipo de error, continuar y dejar que Passport maneje el error
    }
    
    // Si está configurado, usar el guard de Passport
    return super.canActivate(context);
  }
}

