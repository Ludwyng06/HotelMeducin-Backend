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
        
        // Variable para rastrear la posición Y actual
        let currentY = 155; // Después del header (150px + 5px separador)
        
        // Reservation details con diseño mejorado
        currentY = this.addReservationDetails(doc, reservation, currentY);
        
        // Guests information con diseño mejorado
        currentY = this.addGuestsInfo(doc, reservation.guests, currentY);
        
        // Pricing summary con diseño mejorado
        currentY = this.addPricingSummary(doc, reservation, currentY);
        
        // Terms and conditions con diseño mejorado
        currentY = this.addTermsAndConditions(doc, currentY);
        
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
    
    // Fondo azul sólido en el header
    doc.rect(0, 0, pageWidth, 150)
       .fill('#1e3a8a');
    
    // Elemento decorativo (círculo grande con color claro)
    doc.circle(pageWidth - 80, 75, 70)
       .fill('#93c5fd');
    
    // Línea decorativa horizontal en el header
    doc.rect(0, 0, pageWidth, 3)
       .fill('#60a5fa');
    
    // Logo/Hotel name con mejor diseño y sombra
    doc.fillColor('#ffffff')
       .fontSize(36)
       .font('Helvetica-Bold')
       .text(this.hotelInfo.name, 50, 45);
    
    // Subtítulo con mejor estilo
    doc.fontSize(13)
       .font('Helvetica')
       .fillColor('#dbeafe')
       .text('Confirmación de Reserva', 50, 85);
    
    // Caja decorativa para información de contacto
    const contactBoxWidth = 200;
    const contactBoxX = pageWidth - contactBoxWidth - 40;
    doc.rect(contactBoxX, 50, contactBoxWidth, 80)
       .fill('#1e3a8a')
       .stroke('#60a5fa', 1);
    
    // Hotel contact info en el header (derecha, texto blanco)
    doc.fontSize(9)
       .font('Helvetica')
       .fillColor('#ffffff')
       .text(this.hotelInfo.address, contactBoxX + 10, 60, {
         width: contactBoxWidth - 20,
         align: 'left',
         lineGap: 4
       })
       .text(`Tel: ${this.hotelInfo.phone}`, contactBoxX + 10, 85, {
         width: contactBoxWidth - 20,
         align: 'left'
       })
       .text(`Email: ${this.hotelInfo.email}`, contactBoxX + 10, 100, {
         width: contactBoxWidth - 20,
         align: 'left'
       });
    
    // Separador decorativo más grueso
    doc.rect(0, 150, pageWidth, 5)
       .fill('#3b82f6');
  }

  private addReservationDetails(doc: PDFDocument, reservation: any, startY: number): number {
    const pageWidth = doc.page.width;
    const margin = 50;
    const spacing = 20; // Espacio entre secciones
    const boxHeight = 220; // Altura generosa para la caja (se ajustará si es necesario)
    
    // Caja con fondo y borde mejorado para los detalles
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), boxHeight)
       .fill('#ffffff')
       .stroke('#cbd5e1', 1.5);
    
    // Barra de color lateral para identificación visual
    doc.rect(margin, startY - 10, 5, boxHeight)
       .fill('#1e40af');
    
    // Icono decorativo (rectángulo pequeño) antes del título
    doc.rect(margin + 20, startY + 5, 4, 18)
       .fill('#1e40af');
    
    // Título de sección sin emoji con mejor espaciado
    doc.fillColor('#1e40af')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('Detalles de la Reserva', margin + 30, startY + 5);
    
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
    
    let yPos = startY + 40;
    const lineHeight = 22;
    
    // Código de reserva destacado con mejor diseño
    doc.fillColor('#374151')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('Código de Reserva:', margin + 25, yPos);
    
    // Caja destacada para el código de reserva
    const codeWidth = doc.widthOfString(reservationCode, { fontSize: 16 }) + 20;
    doc.rect(margin + 25, yPos + 18, codeWidth, 24)
       .fill('#f0fdf4')
       .stroke('#10b981', 1.5);
    
    doc.fillColor('#059669')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text(reservationCode, margin + 35, yPos + 25);
    
    yPos += 60;
    
    // Información en dos columnas para mejor uso del espacio
    const leftCol = margin + 25;
    const rightCol = margin + 300;
    
    // Columna izquierda
    doc.fillColor('#374151')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('Fecha de Entrada:', leftCol, yPos)
       .font('Helvetica')
       .fillColor('#1f2937')
       .fontSize(12)
       .text(checkInDate, leftCol, yPos + 18)
       .font('Helvetica-Bold')
       .fillColor('#374151')
       .fontSize(11)
       .text('Noches:', leftCol, yPos + 50)
       .font('Helvetica')
       .fillColor('#1f2937')
       .fontSize(12)
       .text(`${nights} noche${nights > 1 ? 's' : ''}`, leftCol, yPos + 68);
    
    // Columna derecha
    doc.fillColor('#374151')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('Fecha de Salida:', rightCol, yPos)
       .font('Helvetica')
       .fillColor('#1f2937')
       .fontSize(12)
       .text(checkOutDate, rightCol, yPos + 18)
       .font('Helvetica-Bold')
       .fillColor('#374151')
       .fontSize(11)
       .text('Habitación:', rightCol, yPos + 50)
       .font('Helvetica')
       .fillColor('#1f2937')
       .fontSize(12)
       .text(`${reservation.roomId?.name || 'N/A'} - ${reservation.roomId?.roomNumber || 'N/A'}`, rightCol, yPos + 68, {
         width: pageWidth - rightCol - margin - 20,
         align: 'left'
       });
    
    yPos += 95;
    
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
      yPos += 30; // Espacio adicional para solicitudes especiales
    } else {
      yPos += 20; // Espacio adicional si no hay solicitudes especiales
    }
    
    // Calcular altura real de la sección basada en el contenido
    const sectionHeight = Math.max(boxHeight, yPos - startY + 30); // Usar la mayor entre la altura de la caja y el contenido real
    
    // Retornar la posición Y final de esta sección
    return startY + sectionHeight + spacing;
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

  private addGuestsInfo(doc: PDFDocument, guests: any[], startY: number): number {
    const margin = 50;
    const pageWidth = doc.page.width;
    const spacing = 20; // Espacio entre secciones
    const pageHeight = doc.page.height;
    
    // Verificar si necesitamos nueva página
    const safeGuests = Array.isArray(guests) ? guests : [];
    const guestsHeight = safeGuests.length === 0 ? 80 : safeGuests.length * 120;
    const sectionHeight = guestsHeight + 50; // Altura total de la sección
    
    if (startY + sectionHeight > pageHeight - 200) {
      doc.addPage();
      startY = 50; // Nueva página, empezar desde arriba
    }
    
    // Caja con fondo mejorado para información de huéspedes
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), guestsHeight + 20)
       .fill('#ffffff')
       .stroke('#cbd5e1', 1.5);
    
    // Barra de color lateral
    doc.rect(margin, startY - 10, 5, guestsHeight + 20)
       .fill('#1e40af');
    
    // Icono decorativo (círculo pequeño) antes del título
    doc.circle(margin + 20, startY + 14, 4)
       .fill('#1e40af');
    
    // Título de sección sin emoji con mejor estilo
    doc.fillColor('#1e40af')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('Información de Huéspedes', margin + 30, startY + 5);
    
    let yPosition = startY + 35;
    
    if (safeGuests.length === 0) {
      doc.fillColor('#6b7280')
         .fontSize(11)
         .font('Helvetica')
         .text('Sin información de huéspedes registrada.', margin + 20, yPosition);
      // Retornar la posición Y final cuando no hay huéspedes
      return startY + sectionHeight + spacing;
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
    
    // Retornar la posición Y final de esta sección
    return startY + sectionHeight + spacing;
  }

  private addPricingSummary(doc: PDFDocument, reservation: any, startY: number): number {
    const margin = 50;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const spacing = 20; // Espacio entre secciones
    const sectionHeight = 150; // Altura fija de esta sección
    
    // Verificar si necesitamos nueva página
    if (startY + sectionHeight > pageHeight - 200) {
      doc.addPage();
      startY = 50; // Nueva página, empezar desde arriba
    }
    
    // Caja destacada para resumen de precios con mejor diseño
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), 150)
       .fill('#eff6ff')
       .stroke('#3b82f6', 2.5);
    
    // Barra de color lateral más gruesa para destacar
    doc.rect(margin, startY - 10, 6, 150)
       .fill('#3b82f6');
    
    // Icono decorativo (diamante pequeño) antes del título
    const diamondSize = 5;
    doc.path(`M ${margin + 20} ${startY + 5} L ${margin + 20 + diamondSize} ${startY + 5 + diamondSize} L ${margin + 20} ${startY + 5 + diamondSize * 2} L ${margin + 20 - diamondSize} ${startY + 5 + diamondSize} Z`)
       .fill('#1e40af');
    
    // Título sin emoji con mejor estilo
    doc.fillColor('#1e40af')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('Resumen de Precios', margin + 30, startY + 5);
    
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
    
    // Retornar la posición Y final de esta sección
    return startY + sectionHeight + spacing;
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

  private addTermsAndConditions(doc: PDFDocument, startY: number): number {
    const margin = 50;
    const pageHeight = doc.page.height;
    const spacing = 20; // Espacio entre secciones
    const sectionHeight = 85; // Altura fija de esta sección
    
    // Verificar si necesitamos nueva página
    if (startY + sectionHeight > pageHeight - 100) {
      doc.addPage();
      startY = 50; // Nueva página, empezar desde arriba
    }
    
    // Caja para términos y condiciones con mejor diseño
    doc.rect(margin, startY - 5, doc.page.width - (margin * 2), 85)
       .fill('#fff7ed')
       .stroke('#fdba74', 1.5);
    
    // Barra de color lateral
    doc.rect(margin, startY - 5, 4, 85)
       .fill('#ea580c');
    
    // Icono decorativo (triángulo pequeño) antes del título
    const triangleSize = 4;
    doc.path(`M ${margin + 20} ${startY + 5} L ${margin + 20 + triangleSize} ${startY + 5 + triangleSize * 2} L ${margin + 20 - triangleSize} ${startY + 5 + triangleSize * 2} Z`)
       .fill('#ea580c');
    
    // Título sin emoji con mejor estilo
    doc.fillColor('#ea580c')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('Términos y Condiciones', margin + 30, startY + 5);
    
    doc.fillColor('#431407')
       .fontSize(9)
       .font('Helvetica')
       .text('• Check-in: 15:00 | Check-out: 12:00', margin + 20, startY + 25)
       .text('• Cancelaciones hasta 24h antes sin costo', margin + 20, startY + 38)
       .text('• Se requiere documento de identidad válido', margin + 20, startY + 51)
       .text('• El hotel se reserva el derecho de admisión', margin + 20, startY + 64);
    
    // Retornar la posición Y final de esta sección
    return startY + sectionHeight + spacing;
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

  /**
   * Generar PDF de análisis de relaciones usando Neo4j
   */
  async generateNetworkAnalysisPDF(analysisData: any): Promise<Buffer> {
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

        // Header
        this.addHeader(doc);
        
        let currentY = 155;
        
        // Título del reporte
        currentY = this.addNetworkAnalysisTitle(doc, currentY);
        
        // Estadísticas generales
        currentY = this.addNetworkStats(doc, analysisData.stats, currentY);
        
        // Usuarios más frecuentes
        currentY = this.addTopUsers(doc, analysisData.topUsers, currentY);
        
        // Habitaciones más reservadas
        currentY = this.addTopRooms(doc, analysisData.topRooms, currentY);
        
        // Patrones de reservación
        currentY = this.addReservationPatterns(doc, analysisData.patterns, currentY);
        
        // Footer
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generar PDF personalizado del historial completo del usuario
   */
  async generateUserHistoryPDF(userData: any, userNetworkData: any): Promise<Buffer> {
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

        // Normalizar datos del usuario (puede venir como Mongoose document)
        const user = userData.toObject ? userData.toObject() : JSON.parse(JSON.stringify(userData));

        // Header personalizado
        this.addUserHeader(doc, user);
        
        let currentY = 155;
        
        // Información del usuario
        currentY = this.addUserInfo(doc, user, currentY);
        
        // Estadísticas del usuario
        if (userNetworkData && userNetworkData.stats) {
          currentY = this.addUserStats(doc, userNetworkData.stats, currentY);
        }
        
        // Historial de reservaciones
        if (userNetworkData && userNetworkData.reservations) {
          currentY = this.addUserReservationsHistory(doc, userNetworkData.reservations, currentY);
        }
        
        // Habitaciones favoritas
        if (userNetworkData && userNetworkData.favoriteRooms && userNetworkData.favoriteRooms.length > 0) {
          currentY = this.addFavoriteRooms(doc, userNetworkData.favoriteRooms, currentY);
        }
        
        // Recomendaciones basadas en usuarios similares
        if (userNetworkData && userNetworkData.similarUsers && userNetworkData.similarUsers.length > 0) {
          currentY = this.addSimilarUsers(doc, userNetworkData.similarUsers, currentY);
        }
        
        // Footer
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addNetworkAnalysisTitle(doc: PDFDocument, startY: number): number {
    const pageWidth = doc.page.width;
    const margin = 50;
    
    doc.fillColor('#1e40af')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('Análisis de Red de Relaciones', margin, startY, {
         width: pageWidth - (margin * 2),
         align: 'center'
       });
    
    doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#6b7280')
       .text('Análisis basado en Neo4j Graph Database', margin, startY + 35, {
         width: pageWidth - (margin * 2),
         align: 'center'
       });
    
    return startY + 60;
  }

  private addNetworkStats(doc: PDFDocument, stats: any, startY: number): number {
    const pageWidth = doc.page.width;
    const margin = 50;
    const spacing = 20;
    
    // Caja de estadísticas
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), 100)
       .fill('#f0f9ff')
       .stroke('#3b82f6', 1.5);
    
    doc.rect(margin, startY - 10, 5, 100)
       .fill('#3b82f6');
    
    doc.fillColor('#1e40af')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Estadísticas Generales', margin + 20, startY + 5);
    
    const leftCol = margin + 30;
    const rightCol = margin + 300;
    let yPos = startY + 35;
    
    doc.fillColor('#374151')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('Total Usuarios:', leftCol, yPos)
       .text('Total Reservaciones:', rightCol, yPos)
       .font('Helvetica')
       .fillColor('#1f2937')
       .fontSize(12)
       .text(String(stats.totalUsers || 0), leftCol, yPos + 18)
       .text(String(stats.totalReservations || 0), rightCol, yPos + 18);
    
    yPos += 45;
    
    doc.font('Helvetica-Bold')
       .fillColor('#374151')
       .fontSize(11)
       .text('Total Habitaciones:', leftCol, yPos)
       .text('Reservaciones Totales:', rightCol, yPos)
       .font('Helvetica')
       .fillColor('#1f2937')
       .fontSize(12)
       .text(String(stats.totalRooms || 0), leftCol, yPos + 18)
       .text(String(stats.totalReservationsAll || 0), rightCol, yPos + 18);
    
    return startY + 100 + spacing;
  }

  private addTopUsers(doc: PDFDocument, topUsers: any[], startY: number): number {
    const pageWidth = doc.page.width;
    const margin = 50;
    const spacing = 20;
    
    if (!topUsers || topUsers.length === 0) {
      return startY;
    }
    
    // Verificar si necesitamos nueva página
    const sectionHeight = 80 + (topUsers.length * 25);
    if (startY + sectionHeight > 700) {
      doc.addPage();
      startY = 50;
    }
    
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), sectionHeight)
       .fill('#ffffff')
       .stroke('#cbd5e1', 1.5);
    
    doc.rect(margin, startY - 10, 5, sectionHeight)
       .fill('#1e40af');
    
    doc.fillColor('#1e40af')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('Usuarios Más Frecuentes', margin + 20, startY + 5);
    
    // Headers
    const headers = ['Usuario', 'Email', 'Total Reservaciones'];
    const colWidths = [200, 200, 150];
    let xPos = margin + 25;
    let yPos = startY + 35;
    
    headers.forEach((header, index) => {
      doc.fillColor('#374151')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(header, xPos, yPos);
      xPos += colWidths[index];
    });
    
    yPos += 20;
    doc.moveTo(margin + 25, yPos)
       .lineTo(pageWidth - margin - 25, yPos)
       .stroke('#e5e7eb', 1);
    yPos += 10;
    
    // Datos
    topUsers.forEach((user, index) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
      
      xPos = margin + 25;
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
      
      doc.fillColor('#1f2937')
         .fontSize(10)
         .font('Helvetica')
         .text(fullName, xPos, yPos, { width: colWidths[0] });
      xPos += colWidths[0];
      
      doc.text(user.email || 'N/A', xPos, yPos, { width: colWidths[1] });
      xPos += colWidths[1];
      
      doc.text(String(user.totalReservations || 0), xPos, yPos, { width: colWidths[2] });
      
      yPos += 25;
    });
    
    return startY + sectionHeight + spacing;
  }

  private addTopRooms(doc: PDFDocument, topRooms: any[], startY: number): number {
    const pageWidth = doc.page.width;
    const margin = 50;
    const spacing = 20;
    
    if (!topRooms || topRooms.length === 0) {
      return startY;
    }
    
    const sectionHeight = 80 + (topRooms.length * 25);
    if (startY + sectionHeight > 700) {
      doc.addPage();
      startY = 50;
    }
    
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), sectionHeight)
       .fill('#ffffff')
       .stroke('#cbd5e1', 1.5);
    
    doc.rect(margin, startY - 10, 5, sectionHeight)
       .fill('#10b981');
    
    doc.fillColor('#059669')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('Habitaciones Más Reservadas', margin + 20, startY + 5);
    
    const headers = ['Habitación', 'Precio', 'Total Reservaciones'];
    const colWidths = [250, 150, 150];
    let xPos = margin + 25;
    let yPos = startY + 35;
    
    headers.forEach((header, index) => {
      doc.fillColor('#374151')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(header, xPos, yPos);
      xPos += colWidths[index];
    });
    
    yPos += 20;
    doc.moveTo(margin + 25, yPos)
       .lineTo(pageWidth - margin - 25, yPos)
       .stroke('#e5e7eb', 1);
    yPos += 10;
    
    topRooms.forEach((room) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
      
      xPos = margin + 25;
      doc.fillColor('#1f2937')
         .fontSize(10)
         .font('Helvetica')
         .text(room.roomName || 'N/A', xPos, yPos, { width: colWidths[0] });
      xPos += colWidths[0];
      
      doc.text(`$${room.price || 0}`, xPos, yPos, { width: colWidths[1] });
      xPos += colWidths[1];
      
      doc.text(String(room.totalReservations || 0), xPos, yPos, { width: colWidths[2] });
      
      yPos += 25;
    });
    
    return startY + sectionHeight + spacing;
  }

  private addReservationPatterns(doc: PDFDocument, patterns: any[], startY: number): number {
    const pageWidth = doc.page.width;
    const margin = 50;
    const spacing = 20;
    
    if (!patterns || patterns.length === 0) {
      return startY;
    }
    
    const sectionHeight = 80 + (patterns.length * 25);
    if (startY + sectionHeight > 700) {
      doc.addPage();
      startY = 50;
    }
    
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), sectionHeight)
       .fill('#fff7ed')
       .stroke('#fdba74', 1.5);
    
    doc.rect(margin, startY - 10, 5, sectionHeight)
       .fill('#ea580c');
    
    doc.fillColor('#ea580c')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('Patrones de Reservación', margin + 20, startY + 5);
    
    const headers = ['Habitación 1', 'Habitación 2', 'Veces Reservadas Juntas'];
    const colWidths = [200, 200, 150];
    let xPos = margin + 25;
    let yPos = startY + 35;
    
    headers.forEach((header, index) => {
      doc.fillColor('#374151')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(header, xPos, yPos);
      xPos += colWidths[index];
    });
    
    yPos += 20;
    doc.moveTo(margin + 25, yPos)
       .lineTo(pageWidth - margin - 25, yPos)
       .stroke('#e5e7eb', 1);
    yPos += 10;
    
    patterns.forEach((pattern) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
      
      xPos = margin + 25;
      doc.fillColor('#1f2937')
         .fontSize(10)
         .font('Helvetica')
         .text(pattern.room1Name || 'N/A', xPos, yPos, { width: colWidths[0] });
      xPos += colWidths[0];
      
      doc.text(pattern.room2Name || 'N/A', xPos, yPos, { width: colWidths[1] });
      xPos += colWidths[1];
      
      doc.text(String(pattern.vecesJuntas || 0), xPos, yPos, { width: colWidths[2] });
      
      yPos += 25;
    });
    
    return startY + sectionHeight + spacing;
  }

  private addUserHeader(doc: PDFDocument, userData: any) {
    const pageWidth = doc.page.width;
    
    doc.rect(0, 0, pageWidth, 150)
       .fill('#1e3a8a');
    
    doc.circle(pageWidth - 80, 75, 70)
       .fill('#93c5fd');
    
    doc.rect(0, 0, pageWidth, 3)
       .fill('#60a5fa');
    
    doc.fillColor('#ffffff')
       .fontSize(36)
       .font('Helvetica-Bold')
       .text(this.hotelInfo.name, 50, 45);
    
    doc.fontSize(13)
       .font('Helvetica')
       .fillColor('#dbeafe')
       .text('Historial Completo del Cliente', 50, 85);
    
    doc.rect(0, 150, pageWidth, 5)
       .fill('#3b82f6');
  }

  private addUserInfo(doc: PDFDocument, userData: any, startY: number): number {
    const pageWidth = doc.page.width;
    const margin = 50;
    const spacing = 20;
    
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), 120)
       .fill('#ffffff')
       .stroke('#cbd5e1', 1.5);
    
    doc.rect(margin, startY - 10, 5, 120)
       .fill('#1e40af');
    
    doc.fillColor('#1e40af')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('Información del Cliente', margin + 20, startY + 5);
    
    const leftCol = margin + 25;
    const rightCol = margin + 300;
    let yPos = startY + 40;
    
    doc.fillColor('#374151')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('Nombre:', leftCol, yPos)
       .text('Email:', rightCol, yPos)
       .font('Helvetica')
       .fillColor('#1f2937')
       .fontSize(12)
       .text(`${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'N/A', leftCol, yPos + 18)
       .text(userData.email || 'N/A', rightCol, yPos + 18);
    
    yPos += 50;
    
    if (userData.phoneNumber) {
      doc.font('Helvetica-Bold')
         .fillColor('#374151')
         .fontSize(11)
         .text('Teléfono:', leftCol, yPos)
         .font('Helvetica')
         .fillColor('#1f2937')
         .fontSize(12)
         .text(userData.phoneNumber, leftCol, yPos + 18);
    }
    
    return startY + 120 + spacing;
  }

  private addUserStats(doc: PDFDocument, stats: any, startY: number): number {
    const pageWidth = doc.page.width;
    const margin = 50;
    const spacing = 20;
    
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), 100)
       .fill('#f0fdf4')
       .stroke('#10b981', 1.5);
    
    doc.rect(margin, startY - 10, 5, 100)
       .fill('#10b981');
    
    doc.fillColor('#059669')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('Estadísticas del Cliente', margin + 20, startY + 5);
    
    const leftCol = margin + 30;
    const rightCol = margin + 300;
    let yPos = startY + 35;
    
    doc.fillColor('#374151')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('Total Reservaciones:', leftCol, yPos)
       .text('Total Gastado:', rightCol, yPos)
       .font('Helvetica')
       .fillColor('#1f2937')
       .fontSize(12)
       .text(String(stats.totalReservations || 0), leftCol, yPos + 18)
       .text(`$${(stats.totalGastado || 0).toLocaleString('es-CO')}`, rightCol, yPos + 18);
    
    yPos += 45;
    
    doc.font('Helvetica-Bold')
       .fillColor('#374151')
       .fontSize(11)
       .text('Promedio por Reservación:', leftCol, yPos)
       .text('Habitaciones Diferentes:', rightCol, yPos)
       .font('Helvetica')
       .fillColor('#1f2937')
       .fontSize(12)
       .text(`$${(stats.promedioReservacion || 0).toLocaleString('es-CO')}`, leftCol, yPos + 18)
       .text(String(stats.habitacionesDiferentes || 0), rightCol, yPos + 18);
    
    return startY + 100 + spacing;
  }

  private addUserReservationsHistory(doc: PDFDocument, reservations: any[], startY: number): number {
    const pageWidth = doc.page.width;
    const margin = 50;
    const spacing = 20;
    
    if (!reservations || reservations.length === 0) {
      return startY;
    }
    
    const sectionHeight = 80 + Math.min(reservations.length * 30, 300);
    if (startY + sectionHeight > 700) {
      doc.addPage();
      startY = 50;
    }
    
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), sectionHeight)
       .fill('#ffffff')
       .stroke('#cbd5e1', 1.5);
    
    doc.rect(margin, startY - 10, 5, sectionHeight)
       .fill('#1e40af');
    
    doc.fillColor('#1e40af')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('Historial de Reservaciones', margin + 20, startY + 5);
    
    let yPos = startY + 35;
    
    reservations.slice(0, 10).forEach((reservation: any, index: number) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
      
      const checkIn = reservation.checkInDate ? new Date(reservation.checkInDate).toLocaleDateString('es-CO') : 'N/A';
      const checkOut = reservation.checkOutDate ? new Date(reservation.checkOutDate).toLocaleDateString('es-CO') : 'N/A';
      
      doc.fillColor('#374151')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(`Reservación ${index + 1}:`, margin + 25, yPos);
      
      doc.font('Helvetica')
         .fillColor('#1f2937')
         .fontSize(9)
         .text(`Habitación: ${reservation.roomName || 'N/A'}`, margin + 25, yPos + 15)
         .text(`Check-in: ${checkIn} | Check-out: ${checkOut}`, margin + 25, yPos + 28)
         .text(`Precio: $${(reservation.totalPrice || 0).toLocaleString('es-CO')} | Estado: ${reservation.status || 'N/A'}`, margin + 25, yPos + 41);
      
      yPos += 55;
    });
    
    if (reservations.length > 10) {
      doc.fillColor('#6b7280')
         .fontSize(9)
         .font('Helvetica')
         .text(`... y ${reservations.length - 10} reservaciones más`, margin + 25, yPos);
      yPos += 20;
    }
    
    return startY + sectionHeight + spacing;
  }

  private addFavoriteRooms(doc: PDFDocument, favoriteRooms: any[], startY: number): number {
    const pageWidth = doc.page.width;
    const margin = 50;
    const spacing = 20;
    
    const sectionHeight = 80 + (favoriteRooms.length * 25);
    if (startY + sectionHeight > 700) {
      doc.addPage();
      startY = 50;
    }
    
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), sectionHeight)
       .fill('#fef3c7')
       .stroke('#f59e0b', 1.5);
    
    doc.rect(margin, startY - 10, 5, sectionHeight)
       .fill('#f59e0b');
    
    doc.fillColor('#d97706')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('Habitaciones Favoritas', margin + 20, startY + 5);
    
    let yPos = startY + 35;
    
    favoriteRooms.forEach((room, index) => {
      doc.fillColor('#374151')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(`${index + 1}. ${room.roomName || 'N/A'}`, margin + 25, yPos);
      
      doc.font('Helvetica')
         .fillColor('#6b7280')
         .fontSize(9)
         .text(`Reservada ${room.vecesReservada || 0} vez${room.vecesReservada !== 1 ? 'es' : ''}`, margin + 25, yPos + 15);
      
      yPos += 35;
    });
    
    return startY + sectionHeight + spacing;
  }

  private addSimilarUsers(doc: PDFDocument, similarUsers: any[], startY: number): number {
    const pageWidth = doc.page.width;
    const margin = 50;
    const spacing = 20;
    
    const sectionHeight = 100;
    if (startY + sectionHeight > 700) {
      doc.addPage();
      startY = 50;
    }
    
    doc.rect(margin, startY - 10, pageWidth - (margin * 2), sectionHeight)
       .fill('#e0e7ff')
       .stroke('#6366f1', 1.5);
    
    doc.rect(margin, startY - 10, 5, sectionHeight)
       .fill('#6366f1');
    
    doc.fillColor('#4f46e5')
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('Recomendaciones Basadas en Usuarios Similares', margin + 20, startY + 5);
    
    doc.fillColor('#6b7280')
       .fontSize(10)
       .font('Helvetica')
       .text('Otros clientes con preferencias similares también han reservado:', margin + 25, startY + 35, {
         width: pageWidth - (margin * 2) - 50
       });
    
    let yPos = startY + 55;
    
    similarUsers.slice(0, 3).forEach((user) => {
      doc.fillColor('#1f2937')
         .fontSize(9)
         .font('Helvetica')
         .text(`• ${user.firstName || ''} ${user.lastName || ''} - ${user.habitacionesComunes || 0} habitaciones en común`, margin + 30, yPos);
      yPos += 20;
    });
    
    return startY + sectionHeight + spacing;
  }
}
