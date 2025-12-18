import { Controller, Get, Query, Post, Body, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from '../services/reports.service';
import { ExcelService } from '../services/excel.service';
import { PdfService } from '../services/pdf.service';
import { Neo4jService } from '../services/neo4j.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TemporalUtils } from '@common/utils/temporal.utils';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly excelService: ExcelService,
    private readonly pdfService: PdfService,
    private readonly neo4jService: Neo4jService
  ) {}

  @Get('users-active')
  getActiveUsers() {
    return this.reportsService.getActiveUsers();
  }

  @Get('reservations-today')
  getReservationsToday() {
    return this.reportsService.getReservationsToday();
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
      timestamp: TemporalUtils.now().toInstant().toString()
    };
  }

  // 📊 Exportar reportes a Excel
  @Get('export-excel')
  async exportToExcel(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response
  ) {
    try {
      const workbook = await this.excelService.generateDashboardReport(startDate, endDate);
      
      // Generar nombre de archivo con fecha
      const now = TemporalUtils.today();
      const dateStr = TemporalUtils.formatDate(now);
      const filename = `reporte-metricas-hotel-${dateStr}.xlsx`;
      
      // Configurar headers para descarga
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      
      // Escribir el workbook al response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error generando Excel:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar el archivo Excel',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 📊 Exportar análisis de red a PDF (usando Neo4j)
  @Get('export-network-analysis-pdf')
  async exportNetworkAnalysisPDF(@Res() res: Response) {
    try {
      // Obtener análisis de Neo4j
      const analysisData = await this.neo4jService.getNetworkAnalysis();
      
      // Generar PDF
      const pdfBuffer = await this.pdfService.generateNetworkAnalysisPDF(analysisData);
      
      // Generar nombre de archivo con fecha
      const now = TemporalUtils.today();
      const dateStr = TemporalUtils.formatDate(now);
      const filename = `analisis-red-relaciones-${dateStr}.pdf`;
      
      // Configurar headers para descarga
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generando PDF de análisis de red:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar el PDF de análisis de red',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
