const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testRoomEndpoint() {
  console.log('🧪 Probando endpoint de habitaciones...');
  
  try {
    // Probar endpoint de habitaciones disponibles
    console.log('📋 Probando GET /rooms...');
    const response = await axios.get(`${API_URL}/rooms`);
    console.log('✅ Respuesta exitosa:', response.status);
    console.log('📊 Datos recibidos:', response.data.data?.length || 0, 'habitaciones');
    
    if (response.data.data && response.data.data.length > 0) {
      const firstRoom = response.data.data[0];
      console.log('🏨 Primera habitación:', {
        id: firstRoom._id,
        name: firstRoom.name,
        roomNumber: firstRoom.roomNumber,
        price: firstRoom.price
      });
      
      // Probar endpoint de habitación específica
      console.log(`\n🔍 Probando GET /rooms/${firstRoom._id}...`);
      const roomResponse = await axios.get(`${API_URL}/rooms/${firstRoom._id}`);
      console.log('✅ Habitación específica obtenida:', roomResponse.status);
      console.log('🏨 Datos de la habitación:', {
        id: roomResponse.data.data._id,
        name: roomResponse.data.data.name,
        price: roomResponse.data.data.price
      });
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testRoomEndpoint();
