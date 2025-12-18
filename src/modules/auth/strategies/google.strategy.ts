import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '@services/auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    
    // Log para depuración (sin mostrar valores completos por seguridad)
    if (clientID && clientSecret) {
      console.log(`✅ Google OAuth credentials encontradas. Client ID: ${clientID.substring(0, 20)}...`);
    } else {
      console.warn('⚠️ Google OAuth credentials not configured.');
      console.warn(`   GOOGLE_CLIENT_ID: ${clientID ? '✅ configurado' : '❌ no configurado'}`);
      console.warn(`   GOOGLE_CLIENT_SECRET: ${clientSecret ? '✅ configurado' : '❌ no configurado'}`);
      console.warn('   Verifica que las variables estén en Backend/.env o en las variables de entorno del sistema.');
    }
    
    // Siempre llamar a super() para que Passport registre la estrategia
    // Si no hay credenciales, usar valores placeholder que harán que falle de manera controlada
    // El guard verificará las credenciales antes de permitir el uso de la estrategia
    if (!clientID || !clientSecret) {
      // Usar valores placeholder para que Passport registre la estrategia
      // Estos valores harán que falle cuando se intente usar, pero el guard verificará antes
      super({
        clientID: 'placeholder-not-configured',
        clientSecret: 'placeholder-not-configured',
        callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/auth/google/callback',
        scope: ['email', 'profile'],
      });
      return;
    }
    
    // Si hay credenciales, inicializar la estrategia normalmente
    super({
      clientID,
      clientSecret,
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  get configured(): boolean {
    // Verificar dinámicamente si está configurada
    const clientID = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    return !!(clientID && clientSecret && clientID !== 'placeholder-not-configured' && clientSecret !== 'placeholder-not-configured');
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const startTime = Date.now();
    const { id, name, emails, photos } = profile;
    
    const user = {
      googleId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0]?.value,
      accessToken,
      refreshToken,
    };

    console.log(`⚡ [Google OAuth] Iniciando validación para: ${user.email}`);
    
    // Buscar o crear usuario en la base de datos
    const dbUser = await this.authService.validateOrCreateGoogleUser(user);
    
    const elapsed = Date.now() - startTime;
    console.log(`⚡ [Google OAuth] Validación completada en ${elapsed}ms para: ${user.email}`);
    
    if (!dbUser) {
      return done(new Error('No se pudo crear o encontrar el usuario'), false);
    }
    
    done(null, dbUser);
  }
}

