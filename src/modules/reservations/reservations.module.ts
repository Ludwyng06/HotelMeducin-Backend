import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationsService } from '@services/reservations.service';
import { ReservationsController } from '@controllers/reservations.controller';
import { RecepcionistaController } from '@controllers/recepcionista.controller';
import { Reservation, ReservationSchema } from '@models/reservations/reservation.schema';
import { RedisService } from '@config/redis.service';
import { PdfService } from '@services/pdf.service';
import { EmailService } from '@services/email.service';
import { GuestsModule } from '../guests/guests.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { RoomsModule } from '../rooms/rooms.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reservation.name, schema: ReservationSchema }]),
    GuestsModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => Neo4jModule),
    RoomsModule,
    UsersModule,
  ],
  controllers: [ReservationsController, RecepcionistaController],
  providers: [ReservationsService, RedisService, PdfService, EmailService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
