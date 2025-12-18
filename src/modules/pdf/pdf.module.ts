import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PdfService } from '@services/pdf.service';
import { EmailService } from '@services/email.service';
import { Neo4jService } from '@services/neo4j.service';
import { PdfController } from '@controllers/pdf.controller';
import { ReservationsModule } from '../reservations/reservations.module';
import { GuestsModule } from '../guests/guests.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, ReservationsModule, GuestsModule, UsersModule],
  providers: [PdfService, EmailService, Neo4jService],
  controllers: [PdfController],
  exports: [PdfService, EmailService],
})
export class PdfModule {}
