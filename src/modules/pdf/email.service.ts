import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PdfService } from './pdf.service';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private currentTransportConfig: {
    host: string;
    port: number;
    secure: boolean;
    requireTLS?: boolean;
    name?: string;
  } | null = null;

  constructor(
    private configService: ConfigService,
    private pdfService: PdfService
  ) {
    // No bloqueamos el constructor; lazily construimos el transporter al verificar o enviar
    this.transporter = null as unknown as nodemailer.Transporter;
  }

  private async buildCandidates() {
    const envHost = this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com');
    const envPort = Number(this.configService.get<string>('EMAIL_PORT', '465'));
    const secureEnv = this.configService.get<string>('EMAIL_SECURE');
    const envSecure = typeof secureEnv === 'string' ? secureEnv.toLowerCase() === 'true' : envPort === 465;
    const name = this.configService.get('EMAIL_CLIENT_NAME', 'hotelmeducin.local');
    const user = this.configService.get('EMAIL_USER');
    const pass = this.configService.get('EMAIL_PASS');

    const common = {
      name,
      auth: { user, pass },
      pool: true,
      maxConnections: 1,
      maxMessages: 10,
      tls: { rejectUnauthorized: false },
      logger: true,
      debug: true,
    } as const;

    const candidates = [
      // 1) Config exacta por .env
      { host: envHost, port: envPort, secure: envSecure, requireTLS: !envSecure },
      // 2) Gmail 465
      { host: 'smtp.gmail.com', port: 465, secure: true, requireTLS: false },
      // 3) Gmail 587 STARTTLS
      { host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true },
    ];

    return { candidates, common };
  }

  private async tryCreateTransporter(): Promise<void> {
    const { candidates, common } = await this.buildCandidates();

    let lastError: unknown = null;
    for (const cfg of candidates) {
      try {
        const transporter = nodemailer.createTransport({ ...common, ...cfg });
        await transporter.verify();
        this.transporter = transporter;
        this.currentTransportConfig = cfg;
        console.log('✅ SMTP verificado:', cfg);
        return;
      } catch (err) {
        lastError = err;
        console.error('❌ Falló config SMTP:', cfg, err);
      }
    }
    throw lastError instanceof Error ? lastError : new Error('No fue posible inicializar el transporter SMTP');
  }

  async sendReservationConfirmation(reservation: any, guestEmail: string): Promise<void> {
    try {
      if (!this.transporter) {
        await this.tryCreateTransporter();
      }
      // Generar PDF
      const pdfBuffer = await this.pdfService.generateReservationPDF(reservation);
      
      // Configurar email
      const idStr = (reservation?._id && typeof reservation._id.toString === 'function')
        ? reservation._id.toString()
        : String(reservation?._id || '');
      const code = `RES-${idStr.slice(-8).toUpperCase()}`;

      const mailOptions = {
        from: this.configService.get('EMAIL_FROM', 'Hotel Meducin <noreply@hotelmeducin.com>'),
        to: guestEmail,
        subject: `Confirmación de Reserva - ${code}`,
        html: this.getEmailTemplate(reservation),
        attachments: [
          {
            filename: `reserva-${idStr.slice(-8)}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      // Enviar email
      let info: any;
      try {
        info = await this.transporter.sendMail(mailOptions);
      } catch (err: any) {
        // Reintento con recreación del transporter si falla protocolo/saludo
        if (!this.transporter || err?.code === 'EPROTOCOL' || /Invalid greeting/i.test(err?.message || '')) {
          console.warn('⚠️ Reintentando envío recreando transporter...');
          await this.tryCreateTransporter();
          info = await this.transporter.sendMail(mailOptions);
        } else {
          throw err;
        }
      }
      console.log('✅ Email enviado exitosamente:', info.messageId);
      
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      throw new Error('Error al enviar confirmación por email');
    }
  }

  private getEmailTemplate(reservation: any): string {
    const checkInDate = new Date(reservation.checkInDate).toLocaleDateString('es-CO');
    const checkOutDate = new Date(reservation.checkOutDate).toLocaleDateString('es-CO');
    const nights = Math.ceil((new Date(reservation.checkOutDate).getTime() - new Date(reservation.checkInDate).getTime()) / (1000 * 60 * 60 * 24));
    const idStr = (reservation?._id && typeof reservation._id.toString === 'function')
      ? reservation._id.toString()
      : String(reservation?._id || '');
    const reservationCode = `RES-${idStr.slice(-8).toUpperCase()}`;

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Reserva</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .reservation-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f1f5f9; border-radius: 5px; }
            .detail-label { font-weight: bold; color: #1e3a8a; }
            .detail-value { color: #374151; }
            .guests-section { margin: 20px 0; }
            .guest-card { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #10b981; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; background: #1e3a8a; color: white; border-radius: 8px; }
            .btn { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏨 Hotel Meducin</h1>
                <h2>Confirmación de Reserva</h2>
                <p>Código: ${reservationCode}</p>
            </div>
            
            <div class="content">
                <div class="reservation-details">
                    <h3>📋 Detalles de la Reserva</h3>
                    <div class="detail-row">
                        <span class="detail-label">Fecha de Entrada:</span>
                        <span class="detail-value">${checkInDate}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Fecha de Salida:</span>
                        <span class="detail-value">${checkOutDate}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Noches:</span>
                        <span class="detail-value">${nights}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Habitación:</span>
                        <span class="detail-value">${reservation.roomId?.name || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Número:</span>
                        <span class="detail-value">${reservation.roomId?.roomNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Total:</span>
                        <span class="detail-value">$${Number(reservation.totalPrice || 0).toLocaleString()}</span>
                    </div>
                </div>

                <div class="guests-section">
                    <h3>👥 Huéspedes Registrados</h3>
                    ${reservation.guests?.map((guest: any, index: number) => `
                        <div class="guest-card">
                            <h4>Huésped ${index + 1}${guest.isMainGuest ? ' (Principal)' : ''}</h4>
                            <p><strong>Nombre:</strong> ${guest.firstName} ${guest.lastName}</p>
                            <p><strong>Documento:</strong> ${(guest.documentType?.name || guest.documentType || 'N/A')} ${guest.documentNumber}</p>
                            <p><strong>Nacionalidad:</strong> ${guest.nationality}</p>
                            <p><strong>Contacto:</strong> ${guest.phoneNumber} | ${guest.email}</p>
                        </div>
                    `).join('') || '<p>No hay información de huéspedes disponible.</p>'}
                </div>

                ${reservation.specialRequests ? `
                    <div class="reservation-details">
                        <h3>💬 Solicitudes Especiales</h3>
                        <p>${reservation.specialRequests}</p>
                    </div>
                ` : ''}

                <div style="text-align: center; margin: 30px 0;">
                    <a href="#" class="btn">📱 Ver en la App</a>
                    <a href="#" class="btn">📞 Contactar Hotel</a>
                </div>
            </div>

            <div class="footer">
                <p><strong>Hotel Meducin</strong></p>
                <p>Calle 123 #45-67, Bogotá, Colombia</p>
                <p>Tel: +57 (1) 234-5678 | Email: info@hotelmeducin.com</p>
                <p>Check-in: 15:00 | Check-out: 12:00</p>
                <p style="font-size: 12px; margin-top: 15px;">
                    Este email fue generado automáticamente. Por favor, no responda a este correo.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async testConnection(): Promise<{ ok: boolean; error?: string; config?: any }> {
    try {
      await this.tryCreateTransporter();
      console.log('✅ Conexión de email verificada correctamente');
      return { ok: true, config: this.currentTransportConfig };
    } catch (error) {
      console.error('❌ Error verificando conexión de email:', error);
      return { ok: false, error: (error as Error)?.message || String(error), config: this.currentTransportConfig };
    }
  }
}
