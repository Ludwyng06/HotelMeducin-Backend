import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from '@services/auth.service';
import { TwoFactorService } from '@services/two-factor.service';
import { AuthController } from '@controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { UsersModule } from '../users/users.module';
import { getJwtConfig } from '../../config/jwt.config';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: getJwtConfig,
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFactorService,
    JwtStrategy,
    // GoogleStrategy siempre se registra, pero verifica credenciales en tiempo de ejecución
    // Si no hay credenciales, la estrategia no se inicializará correctamente
    // y el guard manejará el error apropiadamente
    GoogleStrategy,
  ],
  exports: [AuthService, TwoFactorService],
})
export class AuthModule {}
