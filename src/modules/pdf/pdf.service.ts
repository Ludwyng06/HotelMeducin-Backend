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
          margin: 50
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header
        this.addHeader(doc);
        
        // Reservation details
        this.addReservationDetails(doc, reservation);
        
        // Guests information
        this.addGuestsInfo(doc, reservation.guests);
        
        // Pricing summary
        this.addPricingSummary(doc, reservation);
        
        // Terms and conditions
        this.addTermsAndConditions(doc);
        
        // Footer
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addHeader(doc: PDFDocument) {
    // Hotel logo area (placeholder)
    doc.rect(50, 50, 100, 60)
       .fill('#1e3a8a');
    
    doc.fillColor('#ffffff')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text(this.hotelInfo.name, 60, 70);
    
    doc.fontSize(10)
       .text('Confirmación de Reserva', 60, 100);
    
    // Hotel contact info
    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica')
       .text(this.hotelInfo.address, 400, 60)
       .text(`Tel: ${this.hotelInfo.phone}`, 400, 80)
       .text(`Email: ${this.hotelInfo.email}`, 400, 100);
    
    // Line separator
    doc.moveTo(50, 130)
       .lineTo(550, 130)
       .stroke('#1e3a8a', 2);
  }

  private addReservationDetails(doc: PDFDocument, reservation: any) {
    doc.fillColor('#1e3a8a')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Detalles de la Reserva', 50, 160);
    
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
    
    doc.fillColor('#000000')
       .fontSize(12)
       .font('Helvetica')
       .text(`Código de Reserva: ${reservationCode}`, 50, 190)
       .text(`Fecha de Entrada: ${checkInDate}`, 50, 210)
       .text(`Fecha de Salida: ${checkOutDate}`, 50, 230)
       .text(`Noches: ${nights}`, 50, 250)
       .text(`Habitación: ${reservation.roomId?.name || 'N/A'}`, 50, 270)
       .text(`Número: ${reservation.roomId?.roomNumber || 'N/A'}`, 50, 290)
       .text(`Estado: ${this.getStatusText(reservation.status)}`, 50, 310);
    
    if (reservation.specialRequests) {
      doc.text(`Solicitudes Especiales: ${reservation.specialRequests}`, 50, 330);
    }
  }

  private addGuestsInfo(doc: PDFDocument, guests: any[]) {
    doc.fillColor('#1e3a8a')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Información de Huéspedes', 50, 380);
    
    let yPosition = 410;
    const safeGuests = Array.isArray(guests) ? guests : [];
    
    if (safeGuests.length === 0) {
      doc.fillColor('#000000')
         .fontSize(12)
         .font('Helvetica')
         .text('Sin información de huéspedes registrada.', 50, yPosition);
      return;
    }
    
    safeGuests.forEach((guest, index) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.fillColor('#000000')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text(`Huésped ${index + 1}${guest.isMainGuest ? ' (Principal)' : ''}`, 50, yPosition);
      
      yPosition += 20;
      
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Nombre: ${guest.firstName || ''} ${guest.lastName || ''}`.trim(), 70, yPosition)
         .text(`Documento: ${(guest.documentType?.name || guest.documentType || 'N/A')} ${guest.documentNumber || ''}`.trim(), 70, yPosition + 15)
         .text(`Nacionalidad: ${guest.nationality}`, 70, yPosition + 30)
         .text(`Teléfono: ${guest.phoneNumber}`, 70, yPosition + 45)
         .text(`Email: ${guest.email}`, 70, yPosition + 60);
      
      yPosition += 90;
    });
  }

  private addPricingSummary(doc: PDFDocument, reservation: any) {
    const currentPage = doc.page;
    const pageHeight = currentPage.height;
    
    doc.fillColor('#1e3a8a')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Resumen de Precios', 50, pageHeight - 200);
    
    const inD = new Date(reservation.checkInDate);
    const outD = new Date(reservation.checkOutDate);
    const nights = (isNaN(inD.getTime()) || isNaN(outD.getTime()))
      ? 1
      : Math.max(1, Math.ceil((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24)));
    const totalPrice = Number(reservation.totalPrice || 0);
    const pricePerNight = totalPrice / nights;
    
    doc.fillColor('#000000')
       .fontSize(12)
       .font('Helvetica')
       .text(`Precio por noche: $${pricePerNight.toLocaleString()}`, 50, pageHeight - 170)
       .text(`Noches: ${nights}`, 50, pageHeight - 150)
       .text(`Subtotal: $${totalPrice.toLocaleString()}`, 50, pageHeight - 130)
       .text(`Impuestos: $0`, 50, pageHeight - 110)
       .text(`Total: $${totalPrice.toLocaleString()}`, 50, pageHeight - 90)
       .font('Helvetica-Bold')
       .fontSize(14);
  }

  private addTermsAndConditions(doc: PDFDocument) {
    const currentPage = doc.page;
    const pageHeight = currentPage.height;
    
    doc.fillColor('#1e3a8a')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Términos y Condiciones', 50, pageHeight - 60);
    
    doc.fillColor('#000000')
       .fontSize(8)
       .font('Helvetica')
       .text('• Check-in: 15:00 | Check-out: 12:00', 50, pageHeight - 40)
       .text('• Cancelaciones hasta 24h antes sin costo', 50, pageHeight - 30)
       .text('• Se requiere documento de identidad válido', 50, pageHeight - 20)
       .text('• El hotel se reserva el derecho de admisión', 50, pageHeight - 10);
  }

  private addFooter(doc: PDFDocument) {
    const currentPage = doc.page;
    const pageHeight = currentPage.height;
    
    doc.fillColor('#666666')
       .fontSize(8)
       .font('Helvetica')
       .text(`Generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}`, 50, pageHeight - 20)
       .text(`Hotel Meducin - ${this.hotelInfo.website}`, 50, pageHeight - 10);
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
