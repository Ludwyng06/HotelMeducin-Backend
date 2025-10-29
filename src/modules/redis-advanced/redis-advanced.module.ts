import { Module } from '@nestjs/common';
import { RedisAdvancedController } from '@controllers/redis-advanced.controller';
import { RedisService } from '../../config/redis.service';

@Module({
  controllers: [RedisAdvancedController],
  providers: [RedisService],
})
export class RedisAdvancedModule {}
