import { Module } from '@nestjs/common';
import { HotelMetricsController } from './controllers/hotel-metrics.controller';
import { RedisService } from '../../config/redis.service';

@Module({
  controllers: [HotelMetricsController],
  providers: [RedisService],
  exports: [RedisService]
})
export class HotelMetricsModule {}
