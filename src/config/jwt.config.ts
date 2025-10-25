import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const getJwtConfig = (configService: ConfigService): JwtModuleOptions => {
  return {
    secret: configService.get<string>('JWT_SECRET') || 'clave_super_segura_para_jwt_hotel_meducin_2024',
    signOptions: {
      expiresIn: '24h',
    },
  };
};
