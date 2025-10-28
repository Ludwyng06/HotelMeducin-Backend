import { Controller, Get, Post, Body, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PdfService } from './pdf.service';
import { EmailService } from './email.service';
import { ReservationsService } from '../reservations/services/reservations.service';
import { GuestsService } from '../guests/services/guests.service';

@Controller('pdf')
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
    private readonly reservationsService: ReservationsService,
    private readonly guestsService: GuestsService,
  ) {}

  @Get('reservation/:id')
  async generateReservationPDF(@Param('id') id: string, @Res() res: Response) {
    try {
      // Aquí deberías obtener la reserva completa desde la base de datos
      // Por ahora usamos datos de ejemplo
      const reservation = {
        _id: id,
        checkInDate: '2025-10-27',
        checkOutDate: '2025-10-29',
        totalPrice: 160,
        status: 'confirmed',
        specialRequests: 'Vista al mar',
        roomId: {
          name: 'Habitación Doble',
          roomNumber: '201'
        },
        guests: [
          {
            firstName: 'Juan',
            lastName: 'Pérez',
            documentType: { name: 'Cédula de Ciudadanía' },
            documentNumber: '12345678',
            nationality: 'Colombiana',
            phoneNumber: '+57 300 123 4567',
            email: 'juan@email.com',
            isMainGuest: true
          }
        ]
      };

      const pdfBuffer = await this.pdfService.generateReservationPDF(reservation);
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=reserva-${id}.pdf`,
        'Content-Length': pdfBuffer.length,
      });
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generando PDF:', error);
      res.status(500).json({ error: 'Error generando PDF' });
    }
  }

  @Post('send-confirmation')
  async sendReservationConfirmation(@Body() body: { reservationId: string; email: string }) {
    try {
      // Obtener reserva directamente del servicio (evita wrappers del interceptor)
      const reservationDoc = await this.reservationsService.findOne(body.reservationId);
      if (!reservationDoc) {
        throw new Error('Reserva no encontrada');
      }
      const reservation = JSON.parse(JSON.stringify(reservationDoc));

      // Adjuntar huéspedes desde el servicio correspondiente
      const guests = await this.guestsService.findByReservation(body.reservationId);
      reservation.guests = guests?.map((g: any) => ({
        firstName: g.firstName,
        lastName: g.lastName,
        documentType: g.documentType?.name || g.documentType,
        documentNumber: g.documentNumber,
        nationality: g.nationality,
        phoneNumber: g.phoneNumber,
        email: g.email,
        isMainGuest: g.isMainGuest,
      })) || [];

      await this.emailService.sendReservationConfirmation(reservation, body.email);
      
      return {
        success: true,
        message: 'Email de confirmación enviado exitosamente'
      };
    } catch (error) {
      console.error('Error enviando email:', error);
      return {
        success: false,
        message: 'Error enviando email de confirmación',
        error: (error as Error)?.message || String(error)
      };
    }
  }

  @Get('test-email')
  async testEmailConnection() {
    try {
      const result = await this.emailService.testConnection();
      return {
        success: result.ok,
        message: result.ok ? 'Conexión de email exitosa' : 'Error en conexión de email',
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error probando conexión de email',
        error: (error as Error)?.message || String(error)
      };
    }
  }
}
