/**
 * Script de prueba para verificar el envío de emails con Gmail
 * Incluye prueba con PDF adjunto para simular el envío real
 * 
 * Uso: node test-email.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

async function testEmail() {
  console.log('🧪 Iniciando prueba de envío de email...\n');
  console.log('📝 Este script prueba EXACTAMENTE lo que hace el código de producción');
  console.log('   - Genera un PDF de prueba\n   - Lo adjunta al email\n   - Envía con la misma configuración\n');

  // Verificar variables de entorno
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM || `Hotel Meducin <${user}>`;

  console.log('📋 Configuración:');
  console.log('   EMAIL_USER:', user ? `${user.substring(0, 3)}***` : '❌ NO CONFIGURADO');
  console.log('   EMAIL_PASS:', pass ? '***' + pass.substring(pass.length - 4) : '❌ NO CONFIGURADO');
  console.log('   EMAIL_FROM:', from);
  console.log('   EMAIL_HOST:', process.env.EMAIL_HOST || 'smtp.gmail.com');
  console.log('   EMAIL_PORT:', process.env.EMAIL_PORT || '587');
  console.log('');

  if (!user || !pass) {
    console.error('❌ ERROR: EMAIL_USER o EMAIL_PASS no están configurados en .env');
    process.exit(1);
  }

  // Configuraciones a probar (en orden de prioridad)
  const configs = [
    {
      name: 'Gmail 587 STARTTLS (Recomendado)',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
    },
    {
      name: 'Gmail 465 SSL',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      requireTLS: false,
    },
  ];

  for (const cfg of configs) {
    console.log(`\n🔄 Probando: ${cfg.name} (${cfg.host}:${cfg.port})...`);
    
    try {
      // Configuración EXACTA como en el código de producción
      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        requireTLS: cfg.requireTLS,
        auth: {
          user: user,
          pass: pass,
        },
        // Configuración simplificada igual que en producción
        tls: {
          rejectUnauthorized: false,
          ...(cfg.requireTLS ? { minVersion: 'TLSv1.2' } : {})
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        logger: false,
        debug: false,
      });

      // Paso 1: Verificar conexión
      console.log('   ⏳ Verificando conexión SMTP...');
      await transporter.verify();
      console.log('   ✅ Conexión SMTP verificada exitosamente');

      // Paso 2: Generar PDF de prueba (simulando el PDF real)
      console.log('   ⏳ Generando PDF de prueba...');
      const pdfBuffer = await generateTestPDF();
      console.log('   ✅ PDF generado:', (pdfBuffer.length / 1024).toFixed(2), 'KB');

      // Paso 3: Enviar email de prueba CON PDF adjunto (como en producción)
      console.log('   ⏳ Enviando email de prueba con PDF adjunto...');
      const info = await transporter.sendMail({
        from: from,
        to: user, // Enviar a ti mismo para prueba
        subject: '🧪 Prueba de Email - Hotel Meducin',
        html: `
          <h2>✅ Email de Prueba</h2>
          <p>Este es un email de prueba desde el sistema Hotel Meducin.</p>
          <p>Si recibes este email <strong>con el PDF adjunto</strong>, la configuración está correcta.</p>
          <hr>
          <p><strong>Configuración usada:</strong> ${cfg.name}</p>
          <p><strong>Tamaño del PDF:</strong> ${(pdfBuffer.length / 1024).toFixed(2)} KB</p>
        `,
        text: 'Este es un email de prueba desde el sistema Hotel Meducin. Revisa el PDF adjunto.',
        attachments: [
          {
            filename: 'test-reservation.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      console.log('   ✅ Email enviado exitosamente!');
      console.log('   📧 Message ID:', info.messageId);
      console.log('   📬 Revisa tu bandeja de entrada (y spam) para confirmar');
      
      // Cerrar conexión
      transporter.close();
      
      console.log('\n✅ PRUEBA EXITOSA - La configuración funciona correctamente');
      process.exit(0);
      
    } catch (error) {
      console.error(`   ❌ Error con ${cfg.name}:`);
      console.error('   Tipo:', error.constructor.name);
      console.error('   Mensaje:', error.message);
      
      if (error.responseCode) {
        console.error('   Código de respuesta:', error.responseCode);
      }
      
      if (error.code) {
        console.error('   Código:', error.code);
      }

      // Detectar error 421 específicamente
      if (error.responseCode === 421 || /421|Try again later/i.test(error.message)) {
        console.error('\n   ⚠️ ERROR 421: Gmail está bloqueando temporalmente las conexiones');
        console.error('   Posibles causas:');
        console.error('   1. Usas tu contraseña normal en lugar de Contraseña de Aplicación');
        console.error('   2. Demasiados intentos recientes - espera 15-30 minutos');
        console.error('   3. Gmail detectó actividad sospechosa desde tu IP');
        console.error('\n   Solución: Verifica que EMAIL_PASS sea una Contraseña de Aplicación');
        console.error('   https://myaccount.google.com/apppasswords');
      }

      // Continuar con siguiente configuración
      continue;
    }
  }

  console.error('\n❌ TODAS LAS CONFIGURACIONES FALLARON');
  console.error('Revisa tu configuración en el archivo .env');
  process.exit(1);
}

// Función para generar un PDF de prueba (similar al PDF real)
function generateTestPDF() {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header simple
      doc.rect(0, 0, doc.page.width, 140)
         .fill('#1e40af');
      
      doc.fillColor('#ffffff')
         .fontSize(32)
         .font('Helvetica-Bold')
         .text('Hotel Meducin', 50, 40);

      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#e0e7ff')
         .text('Prueba de Email', 50, 75);

      // Contenido de prueba
      doc.fillColor('#1f2937')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('📋 Email de Prueba', 50, 180);

      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text('Este es un PDF de prueba generado para verificar el envío de emails.', 50, 220, {
           width: 500,
           align: 'left'
         });

      doc.fillColor('#059669')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('✅ Si recibes este PDF, la configuración funciona correctamente!', 50, 280, {
           width: 500,
           align: 'left'
         });

      // Footer
      doc.fillColor('#9ca3af')
         .fontSize(10)
         .font('Helvetica')
         .text('Hotel Meducin - Sistema de Reservas', 50, doc.page.height - 50);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Ejecutar prueba
testEmail().catch((error) => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});

