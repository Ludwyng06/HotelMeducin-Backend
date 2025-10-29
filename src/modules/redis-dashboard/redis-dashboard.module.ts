import { Module } from '@nestjs/common';
import { RedisDashboardController } from '@controllers/redis-dashboard.controller';
import { RedisService } from '../../config/redis.service';

@Module({
  controllers: [RedisDashboardController],
  providers: [RedisService],
})
export class RedisDashboardModule {}
