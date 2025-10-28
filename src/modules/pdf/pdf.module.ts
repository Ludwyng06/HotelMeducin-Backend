import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PdfService } from './pdf.service';
import { EmailService } from './email.service';
import { PdfController } from './pdf.controller';
import { ReservationsModule } from '../reservations/reservations.module';
import { GuestsModule } from '../guests/guests.module';

@Module({
  imports: [ConfigModule, ReservationsModule, GuestsModule],
  providers: [PdfService, EmailService],
  controllers: [PdfController],
  exports: [PdfService, EmailService],
})
export class PdfModule {}
