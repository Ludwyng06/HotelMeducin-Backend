/**
 * Script de seeding para poblar la base de datos con categorías y habitaciones de ejemplo
 * 
 * Uso:
 *   node scripts/seed-rooms.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Cargar variables de entorno desde .env si existe
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// URI de MongoDB (usar Docker si está disponible, sino local)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel_meducin_db';

// Esquemas simplificados (sin decoradores de NestJS)
const RoomCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  description: { type: String, required: true },
  icon: String,
  basePrice: { type: Number, required: true },
  maxCapacity: { type: Number, required: true },
  bedTypes: { type: [String], required: true },
  standardAmenities: { type: [String], required: true },
  isActive: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}, { timestamps: true, collection: 'roomCategories' });

const RoomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomCategory', required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  capacity: { type: Number, required: true },
  bedType: { type: String, required: true },
  floor: { type: Number, required: true },
  view: String,
  imageUrls: { type: [String], default: [] },
  amenities: { type: [String], default: [] },
  isAvailable: { type: Boolean, default: true },
  isMaintenance: { type: Boolean, default: false },
  createdAt: Date,
  updatedAt: Date
}, { timestamps: true });

const RoomCategory = mongoose.model('RoomCategory', RoomCategorySchema);
const Room = mongoose.model('Room', RoomSchema);

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Datos de ejemplo
const categories = [
  {
    name: 'Individual',
    code: 'IND',
    description: 'Habitación cómoda para una persona, ideal para viajeros solos.',
    icon: 'single-bed',
    basePrice: 50,
    maxCapacity: 1,
    bedTypes: ['Individual'],
    standardAmenities: ['Wi-Fi', 'TV', 'Aire acondicionado', 'Baño privado', 'Caja fuerte']
  },
  {
    name: 'Doble',
    code: 'DBL',
    description: 'Habitación espaciosa con cama doble, perfecta para parejas.',
    icon: 'double-bed',
    basePrice: 80,
    maxCapacity: 2,
    bedTypes: ['Queen Size'],
    standardAmenities: ['Wi-Fi', 'TV Smart', 'Aire acondicionado', 'Baño privado', 'Minibar', 'Caja fuerte']
  },
  {
    name: 'Twin',
    code: 'TWN',
    description: 'Habitación con dos camas individuales, ideal para amigos o familiares.',
    icon: 'twin-beds',
    basePrice: 85,
    maxCapacity: 2,
    bedTypes: ['Individual', 'Individual'],
    standardAmenities: ['Wi-Fi', 'TV Smart', 'Aire acondicionado', 'Baño privado', 'Minibar', 'Caja fuerte']
  },
  {
    name: 'Triple',
    code: 'TRP',
    description: 'Habitación amplia con capacidad para tres personas.',
    icon: 'triple-bed',
    basePrice: 120,
    maxCapacity: 3,
    bedTypes: ['Queen Size', 'Individual'],
    standardAmenities: ['Wi-Fi', 'TV Smart', 'Aire acondicionado', 'Baño privado', 'Minibar', 'Caja fuerte', 'Balcón']
  },
  {
    name: 'Suite Ejecutiva',
    code: 'STE',
    description: 'Suite elegante con zona de trabajo y área de descanso separada.',
    icon: 'suite',
    basePrice: 200,
    maxCapacity: 2,
    bedTypes: ['King Size'],
    standardAmenities: ['Wi-Fi', 'TV Smart 55"', 'Aire acondicionado', 'Baño privado con jacuzzi', 'Minibar', 'Caja fuerte', 'Balcón', 'Zona de trabajo', 'Sofá cama']
  },
  {
    name: 'Suite Presidencial',
    code: 'STP',
    description: 'La suite más lujosa del hotel con terraza privada y vistas panorámicas.',
    icon: 'presidential-suite',
    basePrice: 350,
    maxCapacity: 4,
    bedTypes: ['King Size'],
    standardAmenities: ['Wi-Fi', 'TV Smart 65"', 'Aire acondicionado', 'Baño privado con jacuzzi y sauna', 'Minibar premium', 'Caja fuerte', 'Terraza privada', 'Zona de trabajo ejecutiva', 'Sala de estar', 'Bar privado']
  }
];

async function seedRooms() {
  try {
    log('\n🌱 Iniciando seeding de habitaciones...', 'cyan');
    
    // Conectar a MongoDB
    log(`📡 Conectando a MongoDB: ${MONGO_URI}`, 'blue');
    await mongoose.connect(MONGO_URI);
    log('✅ Conectado a MongoDB', 'green');
    
    // Limpiar datos existentes (opcional - comentar si quieres conservar datos)
    log('\n🧹 Limpiando datos existentes...', 'yellow');
    await Room.deleteMany({});
    await RoomCategory.deleteMany({});
    log('✅ Datos limpiados', 'green');
    
    // Crear categorías
    log('\n📋 Creando categorías de habitaciones...', 'blue');
    const createdCategories = [];
    for (const categoryData of categories) {
      const category = new RoomCategory(categoryData);
      await category.save();
      createdCategories.push(category);
      log(`  ✓ Categoría creada: ${category.name} (${category.code})`, 'green');
    }
    
    // Crear habitaciones para cada categoría
    log('\n🏨 Creando habitaciones...', 'blue');
    let totalRooms = 0;
    
    // Mapeo de códigos de categoría a prefijos de número de habitación
    const categoryPrefixes = {
      'IND': '1',  // Individual: 1xx
      'DBL': '2',  // Doble: 2xx
      'TWN': '3',  // Twin: 3xx
      'TRP': '4',  // Triple: 4xx
      'STE': '8',  // Suite Ejecutiva: 8xx
      'STP': '9'   // Suite Presidencial: 9xx
    };
    
    for (const category of createdCategories) {
      // Cantidades originales: 2 de cada categoría estándar, 1 de las suites
      const roomsPerCategory = category.code === 'STP' ? 1 : category.code === 'STE' ? 1 : 2;
      const prefix = categoryPrefixes[category.code] || '1';
      // Para solo 1-2 habitaciones por categoría, usar un solo piso
      const floors = category.code === 'STP' ? [10] : category.code === 'STE' ? [8] : 
                     category.code === 'IND' ? [1] : category.code === 'DBL' ? [2] : 
                     category.code === 'TWN' ? [3] : [4];
      
      let roomCounter = 0;
      for (let i = 0; i < roomsPerCategory; i++) {
        const floor = floors[Math.floor(i / (roomsPerCategory / floors.length))];
        const roomIndex = (i % Math.floor(roomsPerCategory / floors.length)) + 1;
        const roomNumber = `${prefix}${String(roomIndex).padStart(2, '0')}`;
        
        // Verificar si la habitación ya existe
        const existingRoom = await Room.findOne({ roomNumber });
        if (existingRoom) {
          log(`  ⚠ Habitación ${roomNumber} ya existe, omitiendo...`, 'yellow');
          continue;
        }
        
        const room = new Room({
          roomNumber,
          categoryId: category._id,
          name: `${category.name} ${roomNumber}`,
          description: category.description,
          price: category.basePrice,
          capacity: category.maxCapacity,
          bedType: category.bedTypes[0],
          floor,
          view: floor >= 8 ? 'Vista panorámica' : 'Vista al jardín',
          imageUrls: [],
          amenities: [...category.standardAmenities],
          isAvailable: true,
          isMaintenance: false
        });
        
        await room.save();
        totalRooms++;
        roomCounter++;
      }
      
      log(`  ✓ ${roomCounter} habitaciones creadas para ${category.name}`, 'green');
    }
    
    log(`\n✅ Seeding completado exitosamente!`, 'green');
    log(`   - ${createdCategories.length} categorías creadas`, 'cyan');
    log(`   - ${totalRooms} habitaciones creadas`, 'cyan');
    
    // Verificar datos
    const categoryCount = await RoomCategory.countDocuments();
    const roomCount = await Room.countDocuments();
    log(`\n📊 Verificación:`, 'blue');
    log(`   - Categorías en BD: ${categoryCount}`, 'cyan');
    log(`   - Habitaciones en BD: ${roomCount}`, 'cyan');
    
    await mongoose.disconnect();
    log('\n✅ Desconectado de MongoDB', 'green');
    process.exit(0);
    
  } catch (error) {
    log(`\n❌ Error durante el seeding: ${error.message}`, 'red');
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Ejecutar
seedRooms();
