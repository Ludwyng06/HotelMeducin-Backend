import { ConfigService } from '@nestjs/config';

export const getRedisConfig = (configService: ConfigService) => {
  return {
    host: configService.get<string>('REDIS_HOST'),
    port: configService.get<number>('REDIS_PORT'),
    ttl: configService.get<number>('REDIS_TTL'),
    prefix: configService.get<string>('CACHE_PREFIX'),
  };
};
