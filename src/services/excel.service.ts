import { Injectable } from '@nestjs/common';
import { ReportsService } from './reports.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelService {
  constructor(private readonly reportsService: ReportsService) {}

  async generateDashboardReport(startDate?: string, endDate?: string): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    
    // Estilos reutilizables con tipos correctos para ExcelJS
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1e40af' } // Azul oscuro
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } }
      }
    };

    const titleStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 14, color: { argb: 'FF1e40af' } },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const }
    };

    const subheaderStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 11, color: { argb: 'FF374151' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' } // Gris claro
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }
      }
    };

    const cellStyle: Partial<ExcelJS.Style> = {
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } }
      }
    };

    const numberStyle: Partial<ExcelJS.Style> = {
      alignment: { horizontal: 'right' as const, vertical: 'middle' as const },
      numFmt: '#,##0.00',
      border: {
        top: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } }
      }
    };

    // Obtener todos los datos
    const [
      reservationsStats,
      activeUsers,
      reservationsByRoom,
      roomOccupancy,
      popularServices,
      monthlyReservations,
      reservationsToday
    ] = await Promise.all([
      this.reportsService.getReservationsStats().catch(() => []),
      this.reportsService.getActiveUsers().catch(() => []),
      this.reportsService.getReservationsByRoom().catch(() => []),
      this.reportsService.getRoomOccupancy().catch(() => []),
      this.reportsService.getPopularServices().catch(() => []),
      startDate && endDate
        ? this.reportsService.getReservationsMonthly(new Date(startDate), new Date(endDate)).catch(() => [])
        : Promise.resolve([]),
      this.reportsService.getReservationsToday().catch(() => null)
    ]);

    // Normalizar datos (los servicios retornan arrays directamente)
    const normalizeData = (data: any): any[] => {
      if (Array.isArray(data)) return data;
      if (data?.data && Array.isArray(data.data)) return data.data;
      return [];
    };

    const statsData = normalizeData(reservationsStats);
    const usersData = normalizeData(activeUsers);
    const roomsData = normalizeData(reservationsByRoom);
    const occupancyData = normalizeData(roomOccupancy);
    const servicesData = normalizeData(popularServices);
    const monthlyData = normalizeData(monthlyReservations);

    // HOJA 1: Resumen Ejecutivo
    const summarySheet = workbook.addWorksheet('Resumen Ejecutivo');
    
    // Título principal
    summarySheet.mergeCells('A1:D1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'REPORTE DE MÉTRICAS DEL HOTEL';
    titleCell.style = {
      font: { bold: true, size: 16, color: { argb: 'FF1e40af' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };
    summarySheet.getRow(1).height = 30;

    // Información del reporte
    summarySheet.getCell('A3').value = 'Fecha de Generación:';
    summarySheet.getCell('B3').value = new Date().toLocaleString('es-CO');
    summarySheet.getCell('A3').style = { font: { bold: true } };
    
    if (startDate && endDate) {
      summarySheet.getCell('A4').value = 'Período:';
      summarySheet.getCell('B4').value = `${startDate} - ${endDate}`;
      summarySheet.getCell('A4').style = { font: { bold: true } };
    }

    let currentRow = 6;

    // Estadísticas de Reservaciones
    if (statsData.length > 0) {
      summarySheet.getCell(`A${currentRow}`).value = 'ESTADÍSTICAS DE RESERVACIONES';
      summarySheet.getCell(`A${currentRow}`).style = titleStyle;
      summarySheet.mergeCells(`A${currentRow}:D${currentRow}`);
      currentRow++;

      // Headers
      const headers = ['Estado', 'Total Reservaciones', 'Ingresos Totales', 'Promedio por Reserva'];
      headers.forEach((header, index) => {
        const cell = summarySheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.style = headerStyle;
      });
      summarySheet.getRow(currentRow).height = 25;
      currentRow++;

      // Datos
      let totalReservations = 0;
      let totalRevenue = 0;
      
      statsData.forEach((stat: any) => {
        const reservations = stat.totalReservations || 0;
        const revenue = stat.totalRevenue || 0;
        const average = stat.averagePrice || (reservations > 0 ? revenue / reservations : 0);
        
        totalReservations += reservations;
        totalRevenue += revenue;

        summarySheet.getCell(currentRow, 1).value = stat.status || stat._id || 'Sin estado';
        summarySheet.getCell(currentRow, 2).value = reservations;
        summarySheet.getCell(currentRow, 3).value = revenue;
        summarySheet.getCell(currentRow, 4).value = average;
        
        summarySheet.getCell(currentRow, 1).style = cellStyle;
        summarySheet.getCell(currentRow, 2).style = numberStyle;
        summarySheet.getCell(currentRow, 3).style = numberStyle;
        summarySheet.getCell(currentRow, 4).style = numberStyle;
        
        currentRow++;
      });

      // Fila de totales
      summarySheet.getCell(currentRow, 1).value = 'TOTAL';
      summarySheet.getCell(currentRow, 1).style = { ...cellStyle, font: { bold: true } };
      summarySheet.getCell(currentRow, 2).value = totalReservations;
      summarySheet.getCell(currentRow, 2).style = { ...numberStyle, font: { bold: true } };
      summarySheet.getCell(currentRow, 3).value = totalRevenue;
      summarySheet.getCell(currentRow, 3).style = { ...numberStyle, font: { bold: true } };
      summarySheet.getCell(currentRow, 4).value = totalReservations > 0 ? totalRevenue / totalReservations : 0;
      summarySheet.getCell(currentRow, 4).style = { ...numberStyle, font: { bold: true } };
      currentRow += 2;
    }

    // Métricas del Día (Reservaciones de Hoy)
    if (reservationsToday) {
      summarySheet.getCell(`A${currentRow}`).value = 'RESERVACIONES DEL DÍA (HOY)';
      summarySheet.getCell(`A${currentRow}`).style = titleStyle;
      summarySheet.mergeCells(`A${currentRow}:D${currentRow}`);
      currentRow++;

      // Información de la fecha
      summarySheet.getCell(`A${currentRow}`).value = `Fecha: ${reservationsToday.date || new Date().toISOString().split('T')[0]}`;
      summarySheet.getCell(`A${currentRow}`).style = { ...cellStyle, font: { italic: true } };
      summarySheet.mergeCells(`A${currentRow}:D${currentRow}`);
      currentRow += 2;

      // Headers
      const todayHeaders = ['Métrica', 'Valor'];
      todayHeaders.forEach((header, index) => {
        const cell = summarySheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.style = headerStyle;
      });
      summarySheet.getRow(currentRow).height = 25;
      currentRow++;

      // Datos de métricas del día
      const todayMetrics = [
        { label: 'Total Reservaciones', value: reservationsToday.total || 0 },
        { label: 'Confirmadas', value: reservationsToday.byStatus?.confirmed || 0 },
        { label: 'Pendientes', value: reservationsToday.byStatus?.pending || 0 },
        { label: 'Canceladas', value: reservationsToday.byStatus?.cancelled || 0 },
        { label: 'Completadas', value: reservationsToday.byStatus?.completed || 0 },
        { label: 'Ingresos del Día', value: reservationsToday.totalRevenue || 0, isCurrency: true }
      ];

      todayMetrics.forEach((metric) => {
        summarySheet.getCell(currentRow, 1).value = metric.label;
        summarySheet.getCell(currentRow, 1).style = cellStyle;
        
        if (metric.isCurrency) {
          summarySheet.getCell(currentRow, 2).value = metric.value;
          summarySheet.getCell(currentRow, 2).style = { ...numberStyle, numFmt: '"$"#,##0.00' };
        } else {
          summarySheet.getCell(currentRow, 2).value = metric.value;
          summarySheet.getCell(currentRow, 2).style = numberStyle;
        }
        
        currentRow++;
      });

      currentRow += 2;
    }

    // Usuarios Activos
    if (usersData.length > 0) {
      summarySheet.getCell(`A${currentRow}`).value = 'USUARIOS ACTIVOS POR ROL';
      summarySheet.getCell(`A${currentRow}`).style = titleStyle;
      summarySheet.mergeCells(`A${currentRow}:D${currentRow}`);
      currentRow++;

      const userHeaders = ['Rol', 'Total Usuarios', 'Usuarios Activos', 'Recientemente Creados'];
      userHeaders.forEach((header, index) => {
        const cell = summarySheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.style = headerStyle;
      });
      summarySheet.getRow(currentRow).height = 25;
      currentRow++;

      usersData.forEach((user: any) => {
        summarySheet.getCell(currentRow, 1).value = user._id || 'Sin rol';
        summarySheet.getCell(currentRow, 2).value = user.totalUsers || 0;
        summarySheet.getCell(currentRow, 3).value = user.activeUsers || 0;
        summarySheet.getCell(currentRow, 4).value = user.recentlyCreated || 0;
        
        [1, 2, 3, 4].forEach(col => {
          summarySheet.getCell(currentRow, col).style = col === 1 ? cellStyle : numberStyle;
        });
        
        currentRow++;
      });
      currentRow += 2;
    }

    // Ajustar ancho de columnas
    summarySheet.columns = [
      { width: 25 },
      { width: 20 },
      { width: 20 },
      { width: 20 }
    ];

    // HOJA 2: Reservaciones por Habitación
    if (roomsData.length > 0) {
      const roomsSheet = workbook.addWorksheet('Reservaciones por Habitación');
      
      roomsSheet.getCell('A1').value = 'RESERVACIONES POR HABITACIÓN';
      roomsSheet.getCell('A1').style = titleStyle;
      roomsSheet.mergeCells('A1:E1');
      roomsSheet.getRow(1).height = 30;

      const roomHeaders = ['Habitación', 'Total Reservaciones', 'Ingresos Totales', 'Precio Promedio', 'Tasa de Ocupación'];
      roomHeaders.forEach((header, index) => {
        const cell = roomsSheet.getCell(2, index + 1);
        cell.value = header;
        cell.style = headerStyle;
      });
      roomsSheet.getRow(2).height = 25;

      let row = 3;
      roomsData.forEach((room: any) => {
        roomsSheet.getCell(row, 1).value = room.roomName || 'N/A';
        roomsSheet.getCell(row, 2).value = room.totalReservations || 0;
        roomsSheet.getCell(row, 3).value = room.totalRevenue || 0;
        roomsSheet.getCell(row, 4).value = room.averagePrice || 0;
        roomsSheet.getCell(row, 5).value = room.occupancyRate || 'Baja';
        
        roomsSheet.getCell(row, 1).style = cellStyle;
        roomsSheet.getCell(row, 2).style = numberStyle;
        roomsSheet.getCell(row, 3).style = numberStyle;
        roomsSheet.getCell(row, 4).style = numberStyle;
        roomsSheet.getCell(row, 5).style = cellStyle;
        
        row++;
      });

      roomsSheet.columns = [
        { width: 30 },
        { width: 20 },
        { width: 20 },
        { width: 18 },
        { width: 18 }
      ];
    }

    // HOJA 3: Ocupación de Habitaciones
    if (occupancyData.length > 0) {
      const occupancySheet = workbook.addWorksheet('Ocupación de Habitaciones');
      
      occupancySheet.getCell('A1').value = 'OCUPACIÓN DE HABITACIONES';
      occupancySheet.getCell('A1').style = titleStyle;
      occupancySheet.mergeCells('A1:C1');
      occupancySheet.getRow(1).height = 30;

      const occupancyHeaders = ['Habitación', 'Total Reservaciones', 'Tasa de Ocupación'];
      occupancyHeaders.forEach((header, index) => {
        const cell = occupancySheet.getCell(2, index + 1);
        cell.value = header;
        cell.style = headerStyle;
      });
      occupancySheet.getRow(2).height = 25;

      let row = 3;
      occupancyData.forEach((room: any) => {
        occupancySheet.getCell(row, 1).value = room._id || 'N/A';
        occupancySheet.getCell(row, 2).value = room.totalReservations || 0;
        occupancySheet.getCell(row, 3).value = room.occupancyRate || 'Baja';
        
        occupancySheet.getCell(row, 1).style = cellStyle;
        occupancySheet.getCell(row, 2).style = numberStyle;
        occupancySheet.getCell(row, 3).style = cellStyle;
        
        row++;
      });

      occupancySheet.columns = [
        { width: 30 },
        { width: 22 },
        { width: 20 }
      ];
    }

    // HOJA 4: Servicios Populares
    if (servicesData.length > 0) {
      const servicesSheet = workbook.addWorksheet('Servicios Populares');
      
      servicesSheet.getCell('A1').value = 'SERVICIOS MÁS POPULARES';
      servicesSheet.getCell('A1').style = titleStyle;
      servicesSheet.mergeCells('A1:D1');
      servicesSheet.getRow(1).height = 30;

      const serviceHeaders = ['Categoría', 'Total Reservaciones', 'Ingresos Totales', 'Nivel de Popularidad'];
      serviceHeaders.forEach((header, index) => {
        const cell = servicesSheet.getCell(2, index + 1);
        cell.value = header;
        cell.style = headerStyle;
      });
      servicesSheet.getRow(2).height = 25;

      let row = 3;
      servicesData.forEach((service: any) => {
        servicesSheet.getCell(row, 1).value = service._id || 'Sin categoría';
        servicesSheet.getCell(row, 2).value = service.totalBookings || 0;
        servicesSheet.getCell(row, 3).value = service.totalRevenue || 0;
        servicesSheet.getCell(row, 4).value = service.popularity || 'Baja';
        
        servicesSheet.getCell(row, 1).style = cellStyle;
        servicesSheet.getCell(row, 2).style = numberStyle;
        servicesSheet.getCell(row, 3).style = numberStyle;
        servicesSheet.getCell(row, 4).style = cellStyle;
        
        row++;
      });

      servicesSheet.columns = [
        { width: 30 },
        { width: 22 },
        { width: 20 },
        { width: 22 }
      ];
    }

    // HOJA 5: Reservaciones Mensuales
    if (monthlyData.length > 0) {
      const monthlySheet = workbook.addWorksheet('Reservaciones Mensuales');
      
      monthlySheet.getCell('A1').value = 'RESERVACIONES MENSUALES';
      monthlySheet.getCell('A1').style = titleStyle;
      monthlySheet.mergeCells('A1:E1');
      monthlySheet.getRow(1).height = 30;

      const monthlyHeaders = ['Mes', 'Año', 'Total Reservaciones', 'Ingresos Totales', 'Precio Promedio'];
      monthlyHeaders.forEach((header, index) => {
        const cell = monthlySheet.getCell(2, index + 1);
        cell.value = header;
        cell.style = headerStyle;
      });
      monthlySheet.getRow(2).height = 25;

      let row = 3;
      monthlyData.forEach((month: any) => {
        monthlySheet.getCell(row, 1).value = month.month || 'N/A';
        monthlySheet.getCell(row, 2).value = month.year || 'N/A';
        monthlySheet.getCell(row, 3).value = month.totalReservations || 0;
        monthlySheet.getCell(row, 4).value = month.totalRevenue || 0;
        monthlySheet.getCell(row, 5).value = month.averagePrice || 0;
        
        monthlySheet.getCell(row, 1).style = cellStyle;
        monthlySheet.getCell(row, 2).style = numberStyle;
        monthlySheet.getCell(row, 3).style = numberStyle;
        monthlySheet.getCell(row, 4).style = numberStyle;
        monthlySheet.getCell(row, 5).style = numberStyle;
        
        row++;
      });

      monthlySheet.columns = [
        { width: 20 },
        { width: 12 },
        { width: 22 },
        { width: 20 },
        { width: 18 }
      ];
    }

    return workbook;
  }
}

