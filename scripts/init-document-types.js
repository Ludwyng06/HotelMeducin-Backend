const mongoose = require('mongoose');

async function initializeDocumentTypes() {
  try {
    await mongoose.connect('mongodb://localhost:27017/hotel_meducin_db');
    console.log('🚀 Inicializando tipos de documento...');

    // Definir esquema
    const documentTypeSchema = new mongoose.Schema({
      name: { type: String, required: true, unique: true },
      code: { type: String, required: true, unique: true },
      validationPattern: { type: String, required: true },
      isActive: { type: Boolean, default: true },
      description: { type: String },
    }, { timestamps: true });

    const DocumentType = mongoose.model('DocumentType', documentTypeSchema);

    // Tipos de documento básicos para Colombia
    const defaultDocumentTypes = [
      {
        name: 'Cédula de Ciudadanía',
        code: 'CC',
        validationPattern: '^[0-9]{6,10}$',
        description: 'Documento de identidad para ciudadanos colombianos',
        isActive: true
      },
      {
        name: 'Tarjeta de Identidad',
        code: 'TI',
        validationPattern: '^[A-Z]{2}[0-9]{6,8}$',
        description: 'Documento de identidad para menores de edad',
        isActive: true
      },
      {
        name: 'Pasaporte',
        code: 'PA',
        validationPattern: '^[A-Z0-9]{6,12}$',
        description: 'Documento de identidad para extranjeros',
        isActive: true
      }
    ];

    // Crear tipos de documento si no existen
    for (const docType of defaultDocumentTypes) {
      await DocumentType.findOneAndUpdate(
        { code: docType.code },
        { $setOnInsert: docType },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log('✅ Tipos de documento creados exitosamente');
    console.log('📋 Tipos disponibles:');
    
    const createdTypes = await DocumentType.find({ isActive: true });
    createdTypes.forEach(type => {
      console.log(`   - ${type.name} (${type.code}): ${type.description}`);
    });

  } catch (error) {
    console.error('❌ Error al inicializar tipos de documento:', error);
  } finally {
    await mongoose.disconnect();
  }
}

initializeDocumentTypes();
