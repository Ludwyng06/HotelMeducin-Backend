import { Module } from '@nestjs/common';
import { ReservationsSchedulerService } from '@services/reservations-scheduler.service';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [
    ReservationsModule, // Importar para acceder a ReservationsService
  ],
  providers: [ReservationsSchedulerService],
})
export class SchedulerModule {}

