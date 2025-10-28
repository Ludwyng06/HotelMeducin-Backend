const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testPublicEndpoints() {
  console.log('🧪 Probando endpoints públicos...');
  
  try {
    // Probar endpoint público de tipos de documento
    console.log('📄 Probando GET /document-types/public...');
    const docTypesResponse = await axios.get(`${API_URL}/document-types/public`);
    console.log('✅ Tipos de documento obtenidos:', docTypesResponse.status);
    console.log('📊 Datos recibidos:', docTypesResponse.data?.length || 0, 'tipos de documento');
    
    if (docTypesResponse.data && docTypesResponse.data.length > 0) {
      console.log('📋 Primer tipo de documento:', {
        id: docTypesResponse.data[0]._id,
        name: docTypesResponse.data[0].name,
        code: docTypesResponse.data[0].code
      });
    }
    
    // Probar endpoint público de verificación de documentos
    console.log('\n🔍 Probando GET /guests/public/check-document...');
    const checkResponse = await axios.get(`${API_URL}/guests/public/check-document?documentNumber=12345678`);
    console.log('✅ Verificación de documento:', checkResponse.status);
    console.log('📊 Resultado:', checkResponse.data);
    
  } catch (error) {
    console.error('❌ Error en la prueba:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testPublicEndpoints();
