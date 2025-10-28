const axios = require('axios');
const mongoose = require('mongoose');

const API_URL = 'http://localhost:3000';

async function testDocumentTypesDetailed() {
  console.log('🧪 Probando tipos de documento en detalle...');
  
  try {
    // 1. Probar endpoint público
    console.log('📄 Probando GET /document-types/public...');
    const response = await axios.get(`${API_URL}/document-types/public`);
    console.log('✅ Status:', response.status);
    console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
    
    // 2. Conectar a MongoDB y verificar directamente
    console.log('\n🗄️ Conectando a MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/hotel_meducin_db');
    console.log('✅ Conectado a MongoDB');
    
    // 3. Verificar colección documenttypes
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('📋 Colecciones disponibles:', collections.map(c => c.name));
    
    // 4. Contar documentos en documenttypes
    const docTypesCollection = db.collection('documenttypes');
    const count = await docTypesCollection.countDocuments();
    console.log(`📊 Documentos en 'documenttypes': ${count}`);
    
    // 5. Obtener todos los documentos
    const documents = await docTypesCollection.find({}).toArray();
    console.log('📋 Documentos encontrados:', documents.length);
    documents.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.name} (${doc.code})`);
    });
    
    // 6. Verificar esquema correcto
    const sampleDoc = documents[0];
    if (sampleDoc) {
      console.log('\n🔍 Estructura del primer documento:');
      console.log('   _id:', sampleDoc._id);
      console.log('   name:', sampleDoc.name);
      console.log('   code:', sampleDoc.code);
      console.log('   validationPattern:', sampleDoc.validationPattern);
      console.log('   isActive:', sampleDoc.isActive);
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

testDocumentTypesDetailed();
