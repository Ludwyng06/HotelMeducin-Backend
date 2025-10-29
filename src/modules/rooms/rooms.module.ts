import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoomsService } from '@services/rooms.service';
import { RoomCategoryService } from '@services/room-category.service';
import { RoomsController } from '@controllers/rooms.controller';
import { RoomCategoryController } from '@controllers/room-category.controller';
import { Room, RoomSchema } from '@models/rooms/room.schema';
import { RoomCategory, RoomCategorySchema } from '@models/rooms/room-category.schema';
import { RedisService } from '../../config/redis.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: RoomCategory.name, schema: RoomCategorySchema }
    ])
  ],
  controllers: [RoomsController, RoomCategoryController],
  providers: [RoomsService, RoomCategoryService, RedisService],
  exports: [RoomsService, RoomCategoryService],
})
export class RoomsModule {}
