import { Module } from '@nestjs/common';
import { RedisAdvancedController } from './redis-advanced.controller';
import { RedisService } from '../../config/redis.service';

@Module({
  controllers: [RedisAdvancedController],
  providers: [RedisService],
})
export class RedisAdvancedModule {}
