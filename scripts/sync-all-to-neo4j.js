/**
 * Script para sincronizar todos los datos de MongoDB a Neo4j
 * Sincroniza usuarios, habitaciones y reservaciones existentes
 * 
 * Uso:
 *   node scripts/sync-all-to-neo4j.js
 */

const mongoose = require('mongoose');
const neo4j = require('neo4j-driver');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuración de MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel_meducin_db';

// Configuración de Neo4j (usar Docker si está disponible)
// Si estamos ejecutando desde fuera de Docker, usar localhost
// Si estamos ejecutando desde dentro de Docker, usar el nombre del servicio
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

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

async function syncAllToNeo4j() {
  let mongoConnection;
  let neo4jDriver;
  let neo4jSession;

  try {
    log('\n🔄 Iniciando sincronización completa a Neo4j...', 'cyan');
    
    // Conectar a MongoDB
    log(`\n📡 Conectando a MongoDB: ${MONGO_URI}`, 'blue');
    mongoConnection = await mongoose.connect(MONGO_URI);
    log('✅ Conectado a MongoDB', 'green');
    
    // Conectar a Neo4j
    log(`\n📡 Conectando a Neo4j: ${NEO4J_URI}`, 'blue');
    neo4jDriver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
      { encrypted: 'ENCRYPTION_OFF' }
    );
    neo4jSession = neo4jDriver.session();
    
    // Verificar conexión
    await neo4jSession.run('RETURN 1');
    log('✅ Conectado a Neo4j', 'green');
    
    // Obtener modelos
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const Room = mongoose.model('Room', new mongoose.Schema({}, { strict: false }), 'rooms');
    const Reservation = mongoose.model('Reservation', new mongoose.Schema({}, { strict: false }), 'reservations');
    const UserRole = mongoose.model('UserRole', new mongoose.Schema({}, { strict: false }), 'userroles');
    
    // Obtener roles para mapeo
    const roles = await UserRole.find().lean();
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role._id.toString()] = role.name;
    });
    
    // 1. Sincronizar usuarios
    log('\n👥 Sincronizando usuarios...', 'blue');
    const users = await User.find().lean();
    log(`   Encontrados ${users.length} usuarios`, 'cyan');
    
    for (const user of users) {
      const roleIdStr = user.roleId?.toString() || '';
      const roleName = roleMap[roleIdStr] || 'user';
      const query = `
        MERGE (u:User {id: $id})
        SET u.email = $email,
            u.firstName = $firstName,
            u.lastName = $lastName,
            u.role = $role
        RETURN u
      `;
      await neo4jSession.run(query, {
        id: user._id.toString(),
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: roleName
      });
    }
    log(`   ✅ ${users.length} usuarios sincronizados`, 'green');
    
    // 2. Sincronizar habitaciones
    log('\n🏨 Sincronizando habitaciones...', 'blue');
    const rooms = await Room.find().lean();
    log(`   Encontradas ${rooms.length} habitaciones`, 'cyan');
    
    for (const room of rooms) {
      const query = `
        MERGE (r:Room {id: $id})
        SET r.name = $name,
            r.roomNumber = $roomNumber,
            r.categoryId = $categoryId,
            r.floor = $floor,
            r.price = $price,
            r.capacity = $capacity,
            r.isAvailable = $isAvailable,
            r.isMaintenance = $isMaintenance
        RETURN r
      `;
      await neo4jSession.run(query, {
        id: room._id.toString(),
        name: room.name || '',
        roomNumber: room.roomNumber || '',
        categoryId: room.categoryId?.toString() || '',
        floor: room.floor || 1,
        price: room.price || 0,
        capacity: room.capacity || 1,
        isAvailable: room.isAvailable !== false,
        isMaintenance: room.isMaintenance === true
      });
    }
    log(`   ✅ ${rooms.length} habitaciones sincronizadas`, 'green');
    
    // 3. Sincronizar reservaciones y relaciones
    log('\n📅 Sincronizando reservaciones...', 'blue');
    const reservations = await Reservation.find().lean();
    log(`   Encontradas ${reservations.length} reservaciones`, 'cyan');
    
    let syncedReservations = 0;
    for (const reservation of reservations) {
      const reservationId = reservation._id.toString();
      const userId = reservation.userId?._id?.toString() || reservation.userId?.toString() || '';
      const roomId = reservation.roomId?._id?.toString() || reservation.roomId?.toString() || '';
      
      if (!userId || !roomId) {
        log(`   ⚠️ Reservación ${reservationId} sin userId o roomId, omitiendo...`, 'yellow');
        continue;
      }
      
      // Crear nodo de reservación
      const reservationQuery = `
        MERGE (res:Reservation {id: $id})
        SET res.userId = $userId,
            res.roomId = $roomId,
            res.checkInDate = $checkInDate,
            res.checkOutDate = $checkOutDate,
            res.status = $status,
            res.totalPrice = $totalPrice
        RETURN res
      `;
      await neo4jSession.run(reservationQuery, {
        id: reservationId,
        userId: userId,
        roomId: roomId,
        checkInDate: new Date(reservation.checkInDate).toISOString(),
        checkOutDate: new Date(reservation.checkOutDate).toISOString(),
        status: reservation.status || 'pending',
        totalPrice: reservation.totalPrice || 0
      });
      
      // Crear relación Usuario -> Reservación
      const userReservationQuery = `
        MATCH (u:User {id: $userId})
        MATCH (res:Reservation {id: $reservationId})
        MERGE (u)-[r:RESERVÓ]->(res)
        RETURN r
      `;
      await neo4jSession.run(userReservationQuery, {
        userId: userId,
        reservationId: reservationId
      });
      
      // Crear relación Reservación -> Habitación
      const reservationRoomQuery = `
        MATCH (res:Reservation {id: $reservationId})
        MATCH (room:Room {id: $roomId})
        MERGE (res)-[r:RESERVADA_EN]->(room)
        RETURN r
      `;
      await neo4jSession.run(reservationRoomQuery, {
        reservationId: reservationId,
        roomId: roomId
      });
      
      syncedReservations++;
    }
    log(`   ✅ ${syncedReservations} reservaciones sincronizadas con relaciones`, 'green');
    
    // Verificar resultados
    log('\n📊 Verificación final:', 'blue');
    const userCount = await neo4jSession.run('MATCH (u:User) RETURN count(u) as count');
    const roomCount = await neo4jSession.run('MATCH (r:Room) RETURN count(r) as count');
    const reservationCount = await neo4jSession.run('MATCH (res:Reservation) RETURN count(res) as count');
    const relationshipCount = await neo4jSession.run('MATCH ()-[r]->() RETURN count(r) as count');
    
    log(`   - Usuarios en Neo4j: ${userCount.records[0].get('count').toNumber()}`, 'cyan');
    log(`   - Habitaciones en Neo4j: ${roomCount.records[0].get('count').toNumber()}`, 'cyan');
    log(`   - Reservaciones en Neo4j: ${reservationCount.records[0].get('count').toNumber()}`, 'cyan');
    log(`   - Relaciones en Neo4j: ${relationshipCount.records[0].get('count').toNumber()}`, 'cyan');
    
    log('\n✅ Sincronización completada exitosamente!', 'green');
    
  } catch (error) {
    log(`\n❌ Error durante la sincronización: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    if (neo4jSession) await neo4jSession.close();
    if (neo4jDriver) await neo4jDriver.close();
    if (mongoConnection) await mongoose.disconnect();
    log('\n✅ Conexiones cerradas', 'green');
  }
}

// Ejecutar
syncAllToNeo4j();
