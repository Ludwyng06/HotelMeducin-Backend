const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testRoomEndpointDetailed() {
  console.log('🧪 Probando endpoint de habitaciones en detalle...');
  
  try {
    // 1. Probar endpoint de habitaciones disponibles
    console.log('🏨 Probando GET /rooms...');
    const roomsResponse = await axios.get(`${API_URL}/rooms`);
    console.log('✅ Status:', roomsResponse.status);
    console.log('📊 Response data structure:', {
      hasSuccess: 'success' in roomsResponse.data,
      hasData: 'data' in roomsResponse.data,
      dataType: Array.isArray(roomsResponse.data) ? 'array' : typeof roomsResponse.data,
      dataLength: Array.isArray(roomsResponse.data) ? roomsResponse.data.length : 'N/A'
    });
    
    if (roomsResponse.data.success && roomsResponse.data.data) {
      console.log('📋 Habitaciones disponibles:', roomsResponse.data.data.length);
      if (roomsResponse.data.data.length > 0) {
        const firstRoom = roomsResponse.data.data[0];
        console.log('🏨 Primera habitación:', {
          id: firstRoom._id,
          name: firstRoom.name,
          roomNumber: firstRoom.roomNumber,
          price: firstRoom.price,
          capacity: firstRoom.capacity
        });
        
        // 2. Probar endpoint específico de habitación
        console.log('\n🔍 Probando GET /rooms/:id...');
        const roomId = firstRoom._id;
        const roomResponse = await axios.get(`${API_URL}/rooms/${roomId}`);
        console.log('✅ Status:', roomResponse.status);
        console.log('📊 Response data structure:', {
          hasSuccess: 'success' in roomResponse.data,
          hasData: 'data' in roomResponse.data,
          dataType: typeof roomResponse.data
        });
        
        if (roomResponse.data.success && roomResponse.data.data) {
          const roomData = roomResponse.data.data;
          console.log('🏨 Datos de habitación específica:', {
            id: roomData._id,
            name: roomData.name,
            roomNumber: roomData.roomNumber,
            price: roomData.price,
            capacity: roomData.capacity,
            isAvailable: roomData.isAvailable,
            categoryId: roomData.categoryId
          });
        } else {
          console.log('📊 Datos directos:', roomResponse.data);
        }
      }
    } else {
      console.log('📊 Datos directos:', roomsResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testRoomEndpointDetailed();
