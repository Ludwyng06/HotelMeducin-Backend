import { Controller, Get, Post, Body, Param, Res, UseGuards, Request } from '@nestjs/common';
import type { Response } from 'express';
import { PdfService } from '@services/pdf.service';
import { EmailService } from '@services/email.service';
import { ReservationsService } from '@services/reservations.service';
import { GuestsService } from '@services/guests.service';
import { Neo4jService } from '@services/neo4j.service';
import { UsersService } from '@services/users.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { TemporalUtils } from '@common/utils/temporal.utils';

@Controller('pdf')
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
    private readonly reservationsService: ReservationsService,
    private readonly guestsService: GuestsService,
    private readonly neo4jService: Neo4jService,
    private readonly usersService: UsersService,
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

  // 📋 Generar PDF del historial completo del usuario
  @Get('user-history')
  @UseGuards(JwtAuthGuard)
  async generateUserHistoryPDF(@Request() req: any, @Res() res: Response) {
    try {
      // El JWT strategy devuelve el usuario en req.user con _id
      const userId = req.user?._id?.toString() || req.user?.sub || req.user?.id;
      
      console.log('🔍 Usuario extraído del token:', {
        user: req.user,
        userId: userId,
        _id: req.user?._id,
        sub: req.user?.sub,
        id: req.user?.id
      });
      
      if (!userId) {
        console.error('❌ No se pudo extraer userId del token JWT');
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado. Por favor, inicia sesión nuevamente.'
        });
      }

      // Obtener datos del usuario desde MongoDB
      const user = await this.usersService.findOne(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Obtener análisis de red del usuario desde Neo4j
      let userNetworkData;
      try {
        userNetworkData = await this.neo4jService.getUserNetworkAnalysis(userId);
      } catch (error) {
        console.warn('Neo4j no disponible, usando datos básicos:', error);
        // Si Neo4j no está disponible, usar datos básicos
        const reservations = await this.reservationsService.findByUser(userId);
        // Convertir user a objeto plano
        const userObj = (user as any).toObject ? (user as any).toObject() : JSON.parse(JSON.stringify(user));
        userNetworkData = {
          user: {
            id: userObj._id?.toString() || userId,
            email: userObj.email,
            firstName: userObj.firstName,
            lastName: userObj.lastName,
            role: userObj.role
          },
          reservations: reservations.map((r: any) => {
            const rObj = (r as any).toObject ? (r as any).toObject() : JSON.parse(JSON.stringify(r));
            return {
              reservationId: rObj._id?.toString() || '',
              checkInDate: rObj.checkInDate,
              checkOutDate: rObj.checkOutDate,
              totalPrice: rObj.totalPrice,
              status: rObj.status,
              roomName: rObj.roomId?.name || 'N/A',
              roomId: rObj.roomId?._id?.toString() || 'N/A'
            };
          }),
          favoriteRooms: [],
          similarUsers: [],
          stats: {
            totalReservations: reservations.length,
            totalGastado: reservations.reduce((sum: number, r: any) => {
              const rObj = (r as any).toObject ? (r as any).toObject() : JSON.parse(JSON.stringify(r));
              return sum + (rObj.totalPrice || 0);
            }, 0),
            promedioReservacion: reservations.length > 0 
              ? reservations.reduce((sum: number, r: any) => {
                  const rObj = (r as any).toObject ? (r as any).toObject() : JSON.parse(JSON.stringify(r));
                  return sum + (rObj.totalPrice || 0);
                }, 0) / reservations.length 
              : 0,
            habitacionesDiferentes: new Set(reservations.map((r: any) => {
              const rObj = (r as any).toObject ? (r as any).toObject() : JSON.parse(JSON.stringify(r));
              return rObj.roomId?._id?.toString();
            })).size
          }
        };
      }

      // Generar PDF
      const pdfBuffer = await this.pdfService.generateUserHistoryPDF(user, userNetworkData);
      
      // Generar nombre de archivo
      const filename = `historial-${user.email}-${TemporalUtils.formatDate(TemporalUtils.today())}.pdf`;
      
      // Configurar headers para descarga
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generando PDF de historial del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar el PDF del historial',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
