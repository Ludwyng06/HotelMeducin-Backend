import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationsService } from '@services/reservations.service';
import { ReservationsController } from '@controllers/reservations.controller';
import { Reservation, ReservationSchema } from '@models/reservations/reservation.schema';
import { RedisService } from '@config/redis.service';
import { PdfService } from '@services/pdf.service';
import { EmailService } from '@services/email.service';
import { GuestsModule } from '../guests/guests.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reservation.name, schema: ReservationSchema }]),
    GuestsModule
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, RedisService, PdfService, EmailService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
