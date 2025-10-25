import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsService } from './services/reports.service';
import { ReportsController } from './controllers/reports.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Reservation, ReservationSchema } from '../reservations/schemas/reservation.schema';
import { Room, RoomSchema } from '../rooms/schemas/room.schema';
import { Service, ServiceSchema } from '../services/schemas/service.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Reservation.name, schema: ReservationSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Service.name, schema: ServiceSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
