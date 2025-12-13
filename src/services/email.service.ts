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
    const envPort = Number(this.configService.get<string>('EMAIL_PORT', '587'));
    const secureEnv = this.configService.get<string>('EMAIL_SECURE');
    const envSecure = typeof secureEnv === 'string' ? secureEnv.toLowerCase() === 'true' : envPort === 465;
    const name = this.configService.get('EMAIL_CLIENT_NAME', 'hotelmeducin.local');
    const user = this.configService.get('EMAIL_USER');
    const pass = this.configService.get('EMAIL_PASS');

    // Validar que tengamos credenciales
    if (!user || !pass) {
      console.warn('⚠️ EMAIL_USER o EMAIL_PASS no están configurados. El envío de emails estará deshabilitado.');
      throw new Error('Configuración de email incompleta. Verifique EMAIL_USER y EMAIL_PASS en el archivo .env');
    }

    const common = {
      name,
      auth: { user, pass },
      tls: { 
        rejectUnauthorized: false
      },
      // Configuración mínima - igual que antes de las mejoras del PDF
    } as const;

    // Priorizar puerto 587 (STARTTLS) que es más confiable con Gmail
    const candidates = [
      // 1) Gmail 587 STARTTLS (más confiable y menos bloqueado)
      { host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true },
      // 2) Config exacta por .env (si es diferente)
      ...(envHost !== 'smtp.gmail.com' || envPort !== 587 
        ? [{ host: envHost, port: envPort, secure: envSecure, requireTLS: !envSecure }] 
        : []),
      // 3) Gmail 465 como último recurso
      { host: 'smtp.gmail.com', port: 465, secure: true, requireTLS: false },
    ];

    return { candidates, common };
  }

  private async tryCreateTransporter(retryCount: number = 0, allConfigsFailed421: boolean = false): Promise<void> {
    // Si todas las configuraciones fallaron con 421, NO intentar nada
    if (allConfigsFailed421) {
      throw new Error('Gmail está bloqueando temporalmente las conexiones (error 421 - rate limit). La reserva fue creada exitosamente. El email se enviará automáticamente cuando Gmail permita nuevas conexiones. Puede descargar el PDF de confirmación manualmente.');
    }
    
    // Cerrar transporter anterior si existe
    if (this.transporter && typeof this.transporter.close === 'function') {
      try {
        this.transporter.close();
      } catch (closeErr) {
        // Ignorar errores al cerrar
      }
      this.transporter = null as unknown as nodemailer.Transporter;
    }

    const { candidates, common } = await this.buildCandidates();

    let lastError: unknown = null;
    let consecutive421Errors = 0; // Contador de errores 421 consecutivos
    const MAX_421_ERRORS = 1; // Reducido a 1 para abortar más rápido
    
    for (const cfg of candidates) {
      try {
        // Si ya detectamos error 421, abortar inmediatamente (Gmail está bloqueando)
        if (consecutive421Errors >= MAX_421_ERRORS) {
          console.error('❌ Gmail está bloqueando conexiones (error 421). Abortando inmediatamente.');
          throw new Error('Gmail está bloqueando temporalmente las conexiones (error 421 - rate limit). La reserva fue creada exitosamente. El email se enviará automáticamente cuando Gmail permita nuevas conexiones. Puede descargar el PDF de confirmación manualmente.');
        }

        // Crear nuevo transporter con configuración optimizada para Gmail
        const transporter = nodemailer.createTransport({ 
          ...common, 
          ...cfg,
          connectionTimeout: 10000, // 10 segundos para dar tiempo a Gmail
          greetingTimeout: 10000,
          socketTimeout: 10000,
          // Configuraciones adicionales para mejorar compatibilidad con Gmail
          ...(cfg.requireTLS ? {
            requireTLS: true,
            tls: {
              ...common.tls,
              minVersion: 'TLSv1.2'
            }
          } : {})
        });
        
        // Verificar conexión con timeout adecuado
        await Promise.race([
          transporter.verify(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Verificación SMTP timeout')), 10000)
          )
        ]);
        
        this.transporter = transporter;
        this.currentTransportConfig = cfg;
        console.log('✅ SMTP verificado exitosamente:', { host: cfg.host, port: cfg.port });
        return; // Éxito, salir
      } catch (err: any) {
        lastError = err;
        const errorMsg = err?.message || String(err);
        const responseCode = err?.responseCode;
        
        // Verificar si es error 421
        const isError421 = 
          responseCode === 421 ||
          /421.*Try again later/i.test(errorMsg) ||
          /Try again later/i.test(errorMsg);
        
        if (isError421) {
          consecutive421Errors++;
          console.warn(`⚠️ Error 421 detectado. Gmail está bloqueando conexiones.`);
          
          // Abortar inmediatamente al primer error 421 para evitar más bloqueos
          throw new Error('Gmail está bloqueando temporalmente las conexiones (error 421 - rate limit). La reserva fue creada exitosamente. El email se enviará automáticamente cuando Gmail permita nuevas conexiones. Puede descargar el PDF de confirmación manualmente.');
        }
        
        // Para otros errores, intentar siguiente configuración
        console.warn(`⚠️ Error SMTP en configuración ${cfg.host}:${cfg.port}:`, errorMsg.substring(0, 100));
        continue; // Intentar siguiente configuración
      }
    }
    
    // Si llegamos aquí, todas las configuraciones fallaron
    const lastErrorMsg = lastError instanceof Error 
      ? lastError.message 
      : String(lastError || 'Error desconocido');
    
    // Verificar si el último error fue 421
    if (/421|Try again later/i.test(lastErrorMsg)) {
      throw new Error('Gmail está bloqueando temporalmente las conexiones (error 421 - rate limit). La reserva fue creada exitosamente. El email se enviará automáticamente cuando Gmail permita nuevas conexiones. Puede descargar el PDF de confirmación manualmente.');
    }
    
    // Para otros errores, lanzar el último error encontrado
    throw lastError || new Error('Error al crear conexión SMTP: ' + lastErrorMsg);
  }

  async sendReservationConfirmation(reservation: any, guestEmail: string): Promise<void> {
    // Generar PDF primero (no depende de SMTP)
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

    // Sistema simplificado: intentar una sola vez rápidamente
    // Como se ejecuta en background, no hay necesidad de múltiples reintentos
    try {
      // Crear transporter (ya maneja la detección rápida de errores 421)
      if (!this.transporter) {
        await this.tryCreateTransporter(0, false);
      }

      // Intentar enviar el email
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email enviado exitosamente:', info.messageId);
      return; // Éxito
      
    } catch (err: any) {
      const errorMessage = err?.message || '';
      const responseCode = err?.responseCode;
      
      // Si el error ya contiene el mensaje de rate limit, simplemente relanzarlo
      if (/Gmail.*bloqueando|rate limit|421/i.test(errorMessage)) {
        console.error('❌ Error enviando email de confirmación (no bloquea la reserva):', errorMessage);
        throw err;
      }
      
      // Para otros errores, proporcionar mensaje genérico
      console.error('❌ Error enviando email de confirmación (no bloquea la reserva):', {
        message: errorMessage,
        responseCode,
        code: err?.code
      });
      
      throw new Error(
        `Error al enviar confirmación por email. ` +
        `La reserva fue creada exitosamente. Puede descargar el PDF manualmente o contactar al hotel. ` +
        `Error: ${errorMessage || 'Error desconocido'}`
      );
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
