const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testDocumentTypesAPI() {
  try {
    console.log('🚀 Probando API de DocumentTypes...');

    // Obtener tipos de documento
    const response = await axios.get(`${API_BASE}/document-types`);
    console.log('✅ GET /document-types:', response.data.length, 'tipos encontrados');
    
    response.data.forEach(dt => {
      console.log(`   - ${dt.name} (${dt.code}): ${dt.description}`);
    });

  } catch (error) {
    if (error.response) {
      console.log('❌ Error de API:', error.response.status, error.response.data);
    } else {
      console.log('❌ Error de conexión:', error.message);
    }
  }
}

async function testGuestsAPI() {
  try {
    console.log('\n🚀 Probando API de Guests...');

    // Obtener huéspedes
    const response = await axios.get(`${API_BASE}/guests`);
    console.log('✅ GET /guests:', response.data.length, 'huéspedes encontrados');

  } catch (error) {
    if (error.response) {
      console.log('❌ Error de API:', error.response.status, error.response.data);
    } else {
      console.log('❌ Error de conexión:', error.message);
    }
  }
}

async function testReservationDraftsAPI() {
  try {
    console.log('\n🚀 Probando API de ReservationDrafts...');

    // Obtener borradores
    const response = await axios.get(`${API_BASE}/reservation-drafts`);
    console.log('✅ GET /reservation-drafts:', response.data.length, 'borradores encontrados');

  } catch (error) {
    if (error.response) {
      console.log('❌ Error de API:', error.response.status, error.response.data);
    } else {
      console.log('❌ Error de conexión:', error.message);
    }
  }
}

async function runTests() {
  console.log('🧪 Iniciando pruebas de API...\n');
  
  await testDocumentTypesAPI();
  await testGuestsAPI();
  await testReservationDraftsAPI();
  
  console.log('\n🎉 Pruebas completadas!');
}

runTests();
