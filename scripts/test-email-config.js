const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailConfiguration() {
  console.log('🧪 Probando configuración de email...\n');

  // Verificar variables de entorno
  const requiredVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('❌ Variables de entorno faltantes:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n📝 Configura las siguientes variables en tu archivo .env:');
    console.log('EMAIL_HOST=smtp.gmail.com');
    console.log('EMAIL_PORT=587');
    console.log('EMAIL_USER=tu-email@gmail.com');
    console.log('EMAIL_PASS=tu-app-password');
    console.log('EMAIL_FROM=Hotel Meducin <noreply@hotelmeducin.com>');
    return;
  }

  console.log('✅ Variables de entorno configuradas correctamente');
  console.log(`   - Host: ${process.env.EMAIL_HOST}`);
  console.log(`   - Puerto: ${process.env.EMAIL_PORT}`);
  console.log(`   - Usuario: ${process.env.EMAIL_USER}`);
  console.log(`   - Contraseña: ${process.env.EMAIL_PASS ? '***configurada***' : 'NO CONFIGURADA'}`);

  // Crear transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    // Verificar conexión
    console.log('\n🔌 Verificando conexión...');
    await transporter.verify();
    console.log('✅ Conexión de email verificada correctamente');

    // Enviar email de prueba
    console.log('\n📧 Enviando email de prueba...');
    const testEmail = process.env.EMAIL_USER; // Enviar a sí mismo
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: testEmail,
      subject: '🧪 Prueba de Configuración - Hotel Meducin',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1>🏨 Hotel Meducin</h1>
            <h2>Configuración de Email Exitosa</h2>
          </div>
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>¡Excelente! Tu configuración de email está funcionando correctamente.</p>
            <p><strong>Detalles de la configuración:</strong></p>
            <ul>
              <li>Host: ${process.env.EMAIL_HOST}</li>
              <li>Puerto: ${process.env.EMAIL_PORT}</li>
              <li>Usuario: ${process.env.EMAIL_USER}</li>
              <li>Fecha de prueba: ${new Date().toLocaleString('es-CO')}</li>
            </ul>
            <p>Ahora puedes generar PDFs y enviar confirmaciones de reserva por email.</p>
          </div>
        </div>
      `
    });

    console.log('✅ Email de prueba enviado exitosamente');
    console.log(`   - Message ID: ${info.messageId}`);
    console.log(`   - Destinatario: ${testEmail}`);

  } catch (error) {
    console.error('❌ Error en configuración de email:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Posibles soluciones:');
      console.log('1. Verifica que tu email y contraseña sean correctos');
      console.log('2. Asegúrate de haber activado la verificación en 2 pasos');
      console.log('3. Genera una "App Password" específica para esta aplicación');
      console.log('4. Revisa que EMAIL_PASS contenga la App Password, no tu contraseña normal');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n💡 Posibles soluciones:');
      console.log('1. Verifica que EMAIL_HOST sea correcto (smtp.gmail.com)');
      console.log('2. Verifica que EMAIL_PORT sea correcto (587)');
      console.log('3. Revisa tu conexión a internet');
    }
  }
}

testEmailConfiguration();
