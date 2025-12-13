import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {
  private readonly hotelInfo = {
    name: process.env.HOTEL_NAME || 'Hotel Meducin',
    address: process.env.HOTEL_ADDRESS || 'Calle 123 #45-67, Bogotá, Colombia',
    phone: process.env.HOTEL_PHONE || '+57 (1) 234-5678',
    email: process.env.HOTEL_EMAIL || 'info@hotelmeducin.com',
    website: process.env.HOTEL_WEBSITE || 'www.hotelmeducin.com'
  };

  async generateReservationPDF(reservation: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 0
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header con diseño mejorado
        this.addHeader(doc);
        
        // Reservation details con diseño mejorado
        this.addReservationDetails(doc, reservation);
        
        // Guests information con diseño mejorado
        this.addGuestsInfo(doc, reservation.guests);
        
        // Pricing summary con diseño mejorado
        this.addPricingSummary(doc, reservation);
        
        // Terms and conditions con diseño mejorado
        this.addTermsAndConditions(doc);
        
        // Footer con diseño mejorado
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(doc: PDFDocument) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    
    // Fondo degradado azul en el header
    doc.rect(0, 0, pageWidth, 140)
       .fill('#1e40af');
    
    // Decorative element (círculo decorativo)
    doc.circle(pageWidth - 100, 70, 60)
       .fill('#3b82f6')
       .opacity(0.3);
    
    // Logo/Hotel name con mejor diseño
    doc.fillColor('#ffffff')
       .fontSize(32)
       .font('Helvetica-Bold')
       .text(this.hotelInfo.name, 50, 40);
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#e0e7ff')
       .text('Confirmación de Reserva', 50, 75);
    
    // Hotel contact info en el header (derecha, texto blanco)
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#ffffff')
       .text(this.hotelInfo.address, pageWidth - 200, 50, {
         width: 180,
         align: 'right'
       })
       .text(`Tel: ${this.hotelInfo.phone}`, pageWidth - 200, 70, {
         width: 180,
         align: 'right'
       })
       .text(`Email: ${this.hotelInfo.email}`, pageWidth - 200, 90, {
         width: 180,
         align: 'right'
       });
    
    // Separador decorativo
    doc.rect(0, 140, pageWidth, 4)
       .fill('#3b82f6');
  }

  private addReservationDetails(doc: PDFDocument, reservation: any) {
    const startY = 170;
    const pageWidth = doc.page.width;
    const margin = 50;
    
    // Caja con fondo y borde para los detalles
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), 160)
       .fill('#f8fafc')
       .stroke('#e2e8f0', 1);
    
    // Título de sección con icono visual
    doc.fillColor('#1e40af')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('📋 Detalles de la Reserva', margin + 15, startY + 5);
    
    const idStr = (reservation?._id && typeof reservation._id.toString === 'function')
      ? reservation._id.toString()
      : String(reservation?._id || '');
    const reservationCode = `RES-${idStr.slice(-8).toUpperCase()}`;
    const checkIn = new Date(reservation.checkInDate);
    const checkOut = new Date(reservation.checkOutDate);
    const checkInDate = isNaN(checkIn.getTime()) ? '-' : checkIn.toLocaleDateString('es-CO');
    const checkOutDate = isNaN(checkOut.getTime()) ? '-' : checkOut.toLocaleDateString('es-CO');
    const nights = (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()))
      ? 1
      : Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
    
    let yPos = startY + 35;
    const lineHeight = 22;
    
    // Código de reserva destacado
    doc.fillColor('#1e40af')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('Código de Reserva:', margin + 20, yPos);
    
    doc.fillColor('#059669')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text(reservationCode, margin + 20, yPos + 15);
    
    yPos += 45;
    
    // Información en dos columnas para mejor uso del espacio
    const leftCol = margin + 20;
    const rightCol = margin + 280;
    
    // Columna izquierda
    doc.fillColor('#374151')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Fecha de Entrada:', leftCol, yPos)
       .font('Helvetica')
       .fillColor('#1f2937')
       .text(checkInDate, leftCol, yPos + 15)
       .font('Helvetica-Bold')
       .fillColor('#374151')
       .text('Noches:', leftCol, yPos + 40)
       .font('Helvetica')
       .fillColor('#1f2937')
       .text(`${nights} noche${nights > 1 ? 's' : ''}`, leftCol, yPos + 55);
    
    // Columna derecha
    doc.fillColor('#374151')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Fecha de Salida:', rightCol, yPos)
       .font('Helvetica')
       .fillColor('#1f2937')
       .text(checkOutDate, rightCol, yPos + 15)
       .font('Helvetica-Bold')
       .fillColor('#374151')
       .text('Habitación:', rightCol, yPos + 40)
       .font('Helvetica')
       .fillColor('#1f2937')
       .text(`${reservation.roomId?.name || 'N/A'} - ${reservation.roomId?.roomNumber || 'N/A'}`, rightCol, yPos + 55);
    
    yPos += 85;
    
    // Estado con badge visual
    const statusText = this.getStatusText(reservation.status);
    const statusColor = this.getStatusColor(reservation.status);
    
    doc.fillColor('#374151')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Estado:', leftCol, yPos);
    
    // Badge de estado
    const statusWidth = doc.widthOfString(statusText, { fontSize: 10 }) + 10;
    doc.rect(leftCol, yPos + 15, statusWidth, 18)
       .fill(statusColor)
       .fillColor('#ffffff')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text(statusText, leftCol + 5, yPos + 20);
    
    // Solicitudes especiales si existen
    if (reservation.specialRequests) {
      yPos += 50;
      doc.fillColor('#374151')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Solicitudes Especiales:', leftCol, yPos)
         .font('Helvetica')
         .fillColor('#1f2937')
         .text(reservation.specialRequests, leftCol, yPos + 15, {
           width: pageWidth - (margin * 2) - 40
         });
    }
  }
  
  private getStatusColor(status: string): string {
    const colorMap = {
      'pending': '#f59e0b',    // Amarillo/Naranja
      'confirmed': '#10b981',  // Verde
      'cancelled': '#ef4444',  // Rojo
      'completed': '#3b82f6'   // Azul
    };
    return colorMap[status] || '#6b7280';
  }

  private addGuestsInfo(doc: PDFDocument, guests: any[]) {
    const margin = 50;
    const pageWidth = doc.page.width;
    let startY = 350;
    
    // Verificar si necesitamos nueva página
    const safeGuests = Array.isArray(guests) ? guests : [];
    const guestsHeight = safeGuests.length === 0 ? 80 : safeGuests.length * 120;
    
    if (startY + guestsHeight > 700) {
      doc.addPage();
      startY = 170;
    }
    
    // Caja con fondo para información de huéspedes
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), guestsHeight + 20)
       .fill('#f8fafc')
       .stroke('#e2e8f0', 1);
    
    // Título de sección
    doc.fillColor('#1e40af')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('👥 Información de Huéspedes', margin + 15, startY + 5);
    
    let yPosition = startY + 35;
    
    if (safeGuests.length === 0) {
      doc.fillColor('#6b7280')
         .fontSize(11)
         .font('Helvetica')
         .text('Sin información de huéspedes registrada.', margin + 20, yPosition);
      return;
    }
    
    safeGuests.forEach((guest, index) => {
      // Caja individual para cada huésped
      const guestBoxHeight = 100;
      doc.rect(margin + 20, yPosition - 5, pageWidth - (margin * 2) - 40, guestBoxHeight)
         .fill('#ffffff')
         .stroke('#e5e7eb', 1);
      
      // Badge para huésped principal
      if (guest.isMainGuest) {
        doc.rect(margin + 20, yPosition - 5, 80, 20)
           .fill('#10b981')
           .fillColor('#ffffff')
           .fontSize(9)
           .font('Helvetica-Bold')
           .text('PRINCIPAL', margin + 25, yPosition);
      }
      
      // Título del huésped
      doc.fillColor('#1e40af')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text(`Huésped ${index + 1}`, margin + (guest.isMainGuest ? 110 : 30), yPosition);
      
      yPosition += 25;
      
      // Información del huésped en dos columnas
      const guestLeftCol = margin + 30;
      const guestRightCol = margin + 280;
      
      // Columna izquierda
      doc.fillColor('#374151')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Nombre:', guestLeftCol, yPosition)
         .font('Helvetica')
         .fillColor('#1f2937')
         .text(`${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'N/A', guestLeftCol, yPosition + 12)
         .font('Helvetica-Bold')
         .fillColor('#374151')
         .text('Documento:', guestLeftCol, yPosition + 30)
         .font('Helvetica')
         .fillColor('#1f2937')
         .text(`${(guest.documentType?.name || guest.documentType || 'N/A')} ${guest.documentNumber || ''}`.trim(), guestLeftCol, yPosition + 42);
      
      // Columna derecha
      doc.fillColor('#374151')
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('Nacionalidad:', guestRightCol, yPosition)
         .font('Helvetica')
         .fillColor('#1f2937')
         .text(guest.nationality || 'N/A', guestRightCol, yPosition + 12)
         .font('Helvetica-Bold')
         .fillColor('#374151')
         .text('Teléfono:', guestRightCol, yPosition + 30)
         .font('Helvetica')
         .fillColor('#1f2937')
         .text(guest.phoneNumber || 'N/A', guestRightCol, yPosition + 42);
      
      if (guest.email) {
        doc.font('Helvetica-Bold')
           .fillColor('#374151')
           .text('Email:', guestLeftCol, yPosition + 55)
           .font('Helvetica')
           .fillColor('#1f2937')
           .text(guest.email, guestLeftCol, yPosition + 67);
      }
      
      yPosition += guestBoxHeight + 15;
    });
  }

  private addPricingSummary(doc: PDFDocument, reservation: any) {
    const margin = 50;
    const pageWidth = doc.page.width;
    const currentPage = doc.page;
    const pageHeight = currentPage.height;
    
    // Calcular posición dinámica basada en el contenido anterior
    let startY = pageHeight - 180;
    
    // Verificar si necesitamos nueva página
    if (startY < 200) {
      doc.addPage();
      startY = 170;
    }
    
    // Caja destacada para resumen de precios
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), 140)
       .fill('#f0f9ff')
       .stroke('#3b82f6', 2);
    
    // Título
    doc.fillColor('#1e40af')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('💰 Resumen de Precios', margin + 15, startY + 5);
    
    const inD = new Date(reservation.checkInDate);
    const outD = new Date(reservation.checkOutDate);
    const nights = (isNaN(inD.getTime()) || isNaN(outD.getTime()))
      ? 1
      : Math.max(1, Math.ceil((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
    const totalPrice = Number(reservation.totalPrice || 0);
    const pricePerNight = nights > 0 ? totalPrice / nights : totalPrice;
    const taxes = 0;
    const subtotal = totalPrice;
    
    let yPos = startY + 35;
    const leftLabel = margin + 30;
    const rightValue = pageWidth - margin - 150;
    
    // Líneas de precio con formato de tabla
    this.addPricingLine(doc, 'Precio por noche', `$${pricePerNight.toLocaleString('es-CO')}`, leftLabel, rightValue, yPos);
    yPos += 22;
    
    this.addPricingLine(doc, `Noches (${nights})`, `$${(pricePerNight * nights).toLocaleString('es-CO')}`, leftLabel, rightValue, yPos);
    yPos += 22;
    
    // Línea separadora
    doc.moveTo(leftLabel, yPos + 5)
       .lineTo(rightValue + 100, yPos + 5)
       .stroke('#cbd5e1', 1);
    yPos += 15;
    
    this.addPricingLine(doc, 'Subtotal', `$${subtotal.toLocaleString('es-CO')}`, leftLabel, rightValue, yPos, true);
    yPos += 22;
    
    this.addPricingLine(doc, 'Impuestos', `$${taxes.toLocaleString('es-CO')}`, leftLabel, rightValue, yPos);
    yPos += 22;
    
    // Línea separadora más gruesa
    doc.moveTo(leftLabel, yPos + 5)
       .lineTo(rightValue + 100, yPos + 5)
       .stroke('#3b82f6', 2);
    yPos += 15;
    
    // Total destacado
    doc.fillColor('#1e40af')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('TOTAL', leftLabel, yPos)
       .fontSize(16)
       .text(`$${totalPrice.toLocaleString('es-CO')}`, rightValue, yPos);
  }
  
  private addPricingLine(doc: PDFDocument, label: string, value: string, x: number, valueX: number, y: number, bold: boolean = false) {
    doc.fillColor('#374151')
       .fontSize(10)
       .font(bold ? 'Helvetica-Bold' : 'Helvetica')
       .text(label, x, y)
       .fillColor('#1f2937')
       .font('Helvetica-Bold')
       .text(value, valueX, y, {
         width: 120,
         align: 'right'
       });
  }

  private addTermsAndConditions(doc: PDFDocument) {
    const margin = 50;
    const currentPage = doc.page;
    const pageHeight = currentPage.height;
    const startY = pageHeight - 100;
    
    // Caja para términos y condiciones
    doc.rect(margin, startY - 5, doc.page.width - (margin * 2), 80)
       .fill('#fff7ed')
       .stroke('#fed7aa', 1);
    
    doc.fillColor('#ea580c')
       .fontSize(13)
       .font('Helvetica-Bold')
       .text('📌 Términos y Condiciones', margin + 15, startY + 5);
    
    doc.fillColor('#431407')
       .fontSize(8)
       .font('Helvetica')
       .text('• Check-in: 15:00 | Check-out: 12:00', margin + 20, startY + 25)
       .text('• Cancelaciones hasta 24h antes sin costo', margin + 20, startY + 38)
       .text('• Se requiere documento de identidad válido', margin + 20, startY + 51)
       .text('• El hotel se reserva el derecho de admisión', margin + 20, startY + 64);
  }

  private addFooter(doc: PDFDocument) {
    const margin = 50;
    const currentPage = doc.page;
    const pageWidth = currentPage.width;
    const pageHeight = currentPage.height;
    
    // Línea decorativa en el footer
    doc.moveTo(margin, pageHeight - 25)
       .lineTo(pageWidth - margin, pageHeight - 25)
       .stroke('#e5e7eb', 1);
    
    // Información del footer
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    doc.fillColor('#6b7280')
       .fontSize(8)
       .font('Helvetica')
       .text(`Generado el ${dateStr} a las ${timeStr}`, margin, pageHeight - 18, {
         width: pageWidth - (margin * 2),
         align: 'left'
       })
       .text(`${this.hotelInfo.name} - ${this.hotelInfo.website}`, margin, pageHeight - 8, {
         width: pageWidth - (margin * 2),
         align: 'left'
       });
  }

  private getStatusText(status: string): string {
    const statusMap = {
      'pending': 'Pendiente',
      'confirmed': 'Confirmada',
      'cancelled': 'Cancelada',
      'completed': 'Completada'
    };
    return statusMap[status] || status;
  }
}
