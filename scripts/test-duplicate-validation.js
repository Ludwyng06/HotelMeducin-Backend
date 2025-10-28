const axios = require('axios');
require('dotenv').config({ path: '../.env' });

const API_URL = 'http://localhost:3000';

// Obtener token de autenticación
async function getAuthToken() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'superadmin@hotel.com',
      password: 'superadmin123'
    });
    return response.data.data.access_token;
  } catch (error) {
    console.error('Error obteniendo token:', error.response?.data || error.message);
    return null;
  }
}

// Probar validación de duplicados
async function testDuplicateValidation() {
  console.log('🧪 Probando validación de duplicados...');
  
  const token = await getAuthToken();
  if (!token) {
    console.error('❌ No se pudo obtener token de autenticación');
    return;
  }

  const api = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  // Datos de prueba con documentos duplicados
  const reservationData = {
    userId: '507f1f77bcf86cd799439011', // ID de usuario de prueba
    roomId: '507f1f77bcf86cd799439012', // ID de habitación de prueba
    checkInDate: '2024-12-25',
    checkOutDate: '2024-12-27',
    totalPrice: 200000,
    guestCount: 2,
    maxCapacity: 4,
    guests: [
      {
        documentType: '507f1f77bcf86cd799439013', // ID de tipo de documento
        documentNumber: '12345678',
        firstName: 'Juan',
        lastName: 'Pérez',
        birthDate: '1990-01-01',
        nationality: 'Colombiana',
        phoneNumber: '+573001234567',
        email: 'juan@email.com',
        isMainGuest: 'true'
      },
      {
        documentType: '507f1f77bcf86cd799439013',
        documentNumber: '12345678', // Mismo número de documento - DEBE FALLAR
        firstName: 'María',
        lastName: 'García',
        birthDate: '1992-05-15',
        nationality: 'Colombiana',
        phoneNumber: '+573001234568',
        email: 'maria@email.com',
        isMainGuest: 'false'
      }
    ]
  };

  try {
    console.log('📝 Enviando reserva con documentos duplicados...');
    const response = await api.post('/reservations', reservationData);
    console.log('❌ ERROR: La validación no funcionó - se creó la reserva con duplicados');
    console.log('Respuesta:', response.data);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ ÉXITO: La validación funcionó correctamente');
      console.log('Mensaje de error:', error.response.data.message);
    } else {
      console.error('❌ Error inesperado:', error.response?.data || error.message);
    }
  }
}

// Probar validación de duplicados en BD
async function testDatabaseDuplicateValidation() {
  console.log('\n🧪 Probando validación de duplicados en base de datos...');
  
  const token = await getAuthToken();
  if (!token) {
    console.error('❌ No se pudo obtener token de autenticación');
    return;
  }

  const api = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  // Primero crear un huésped
  try {
    console.log('📝 Creando primer huésped...');
    const guest1 = await api.post('/guests', {
      reservationId: '507f1f77bcf86cd799439014',
      documentType: '507f1f77bcf86cd799439013',
      documentNumber: '87654321',
      firstName: 'Carlos',
      lastName: 'López',
      birthDate: '1985-03-20',
      nationality: 'Colombiana',
      phoneNumber: '+573001234569',
      email: 'carlos@email.com'
    });
    console.log('✅ Primer huésped creado:', guest1.data._id);
  } catch (error) {
    console.log('ℹ️ Primer huésped ya existe o error:', error.response?.data?.message || error.message);
  }

  // Intentar crear huésped con mismo documento
  try {
    console.log('📝 Intentando crear huésped con documento duplicado...');
    const guest2 = await api.post('/guests', {
      reservationId: '507f1f77bcf86cd799439015',
      documentType: '507f1f77bcf86cd799439013',
      documentNumber: '87654321', // Mismo documento - DEBE FALLAR
      firstName: 'Ana',
      lastName: 'Martínez',
      birthDate: '1988-07-10',
      nationality: 'Colombiana',
      phoneNumber: '+573001234570',
      email: 'ana@email.com'
    });
    console.log('❌ ERROR: Se creó huésped con documento duplicado');
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('✅ ÉXITO: La validación de BD funcionó correctamente');
      console.log('Mensaje de error:', error.response.data.message);
    } else {
      console.error('❌ Error inesperado:', error.response?.data || error.message);
    }
  }
}

async function main() {
  console.log('🚀 Iniciando pruebas de validación de duplicados...\n');
  
  await testDuplicateValidation();
  await testDatabaseDuplicateValidation();
  
  console.log('\n🎉 Pruebas completadas!');
}

main().catch(console.error);
