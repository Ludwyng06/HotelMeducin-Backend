import { Module } from '@nestjs/common';
import { RedisTestController } from './redis-test.controller';
import { RedisService } from '../../config/redis.service';

@Module({
  controllers: [RedisTestController],
  providers: [RedisService],
})
export class RedisTestModule {}
