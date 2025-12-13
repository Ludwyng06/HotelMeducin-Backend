import { Controller, Get, Query, Post, Body, UseGuards } from '@nestjs/common';
import { ReportsService } from '../services/reports.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('users-active')
  getActiveUsers() {
    return this.reportsService.getActiveUsers();
  }

  @Get('reservations-monthly')
  getReservationsMonthly(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getReservationsMonthly(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('room-occupancy')
  getRoomOccupancy() {
    return this.reportsService.getRoomOccupancy();
  }

  @Get('popular-services')
  getPopularServices() {
    return this.reportsService.getPopularServices();
  }

  // 📊 NUEVOS REPORTES MEJORADOS
  @Get('reservations-stats')
  getReservationsStats() {
    return this.reportsService.getReservationsStats();
  }

  @Get('reservations-by-room')
  getReservationsByRoom() {
    return this.reportsService.getReservationsByRoom();
  }

  // 🚀 NUEVOS ENDPOINTS CON PROCESOS ASINCRÓNICOS AVANZADOS

  @Get('all-parallel')
  async generateAllReportsParallel() {
    return this.reportsService.generateAllReports();
  }

  @Post('update-rooms-availability')
  async updateRoomAvailabilityConcurrently(@Body('roomIds') roomIds: string[]) {
    return this.reportsService.updateRoomAvailabilityConcurrently(roomIds);
  }

  @Post('create-reservations-concurrent')
  async createReservationsConcurrently(@Body('reservations') reservations: any[]) {
    return this.reportsService.createReservationsConcurrently(reservations);
  }

  @Post('background-maintenance')
  async runBackgroundMaintenance() {
    
    this.reportsService.backgroundMaintenance().catch(error => {
      console.error('Error en mantenimiento en segundo plano:', error);
    });
    
    return {
      success: true,
      message: 'Mantenimiento en segundo plano iniciado',
      timestamp: new Date()
    };
  }
}
