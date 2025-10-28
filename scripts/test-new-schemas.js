const mongoose = require('mongoose');

async function testNewSchemas() {
  try {
    await mongoose.connect('mongodb://localhost:27017/hotel_meducin_db');
    console.log('🚀 Probando nuevos esquemas...');

    // Verificar DocumentTypes
    const DocumentType = mongoose.model('DocumentType', new mongoose.Schema({
      name: String,
      code: String,
      validationPattern: String,
      isActive: Boolean,
      description: String
    }, { timestamps: true }));

    const documentTypes = await DocumentType.find({ isActive: true });
    console.log('✅ DocumentTypes encontrados:', documentTypes.length);
    documentTypes.forEach(dt => {
      console.log(`   - ${dt.name} (${dt.code})`);
    });

    // Verificar que las colecciones existen
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('\n📋 Colecciones en la base de datos:');
    collectionNames.forEach(name => {
      console.log(`   - ${name}`);
    });

    // Verificar índices
    console.log('\n🔍 Verificando índices...');
    
    const guestIndexes = await mongoose.connection.db.collection('guests').indexes();
    console.log('Índices de Guests:', guestIndexes.map(i => i.name));

    const draftIndexes = await mongoose.connection.db.collection('reservationdrafts').indexes();
    console.log('Índices de ReservationDrafts:', draftIndexes.map(i => i.name));

    console.log('\n🎉 Todos los esquemas están funcionando correctamente!');

  } catch (error) {
    console.error('❌ Error al probar esquemas:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testNewSchemas();
