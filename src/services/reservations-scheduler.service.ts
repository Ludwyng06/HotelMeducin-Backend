import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

@Injectable()
export class ReservationsSchedulerService implements OnModuleInit, OnModuleDestroy {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly reservationsService: ReservationsService
  ) {}

  onModuleInit() {
    // Ejecutar inmediatamente al iniciar
    this.handleExpiredSameDayReservations();
    
    // Ejecutar cada 15 minutos (900000 ms)
    this.intervalId = setInterval(() => {
      this.handleExpiredSameDayReservations();
    }, 15 * 60 * 1000); // 15 minutos
    
    console.log('✅ [SCHEDULER] Servicio de expiración de reservas iniciado (cada 15 minutos)');
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('🛑 [SCHEDULER] Servicio de expiración de reservas detenido');
    }
  }

  async handleExpiredSameDayReservations() {
    console.log('🕐 [SCHEDULER] Verificando reservas del mismo día expiradas...');
    try {
      await this.reservationsService.expireSameDayReservations();
      console.log('✅ [SCHEDULER] Verificación de reservas expiradas completada');
    } catch (error) {
      console.error('❌ [SCHEDULER] Error verificando reservas expiradas:', error);
    }
  }
}

