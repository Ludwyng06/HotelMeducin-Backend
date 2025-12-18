/**
 * Script para verificar reservaciones de un usuario en MongoDB y Neo4j
 */

const mongoose = require('mongoose');
const neo4j = require('neo4j-driver');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel_meducin_db';
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

const email = process.argv[2] || 'isabelceron772@gmail.com';

async function checkReservations() {
  try {
    console.log(`\n🔍 Verificando reservaciones para: ${email}\n`);
    
    // MongoDB
    await mongoose.connect(MONGO_URI);
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const Reservation = mongoose.model('Reservation', new mongoose.Schema({}, { strict: false }), 'reservations');
    
    const user = await User.findOne({ email }).lean();
    if (!user) {
      console.log('❌ Usuario no encontrado en MongoDB');
      process.exit(1);
    }
    
    console.log(`✅ Usuario encontrado: ${user.firstName} ${user.lastName} (ID: ${user._id})`);
    
    const reservations = await Reservation.find({ userId: user._id }).lean();
    console.log(`\n📅 Reservaciones en MongoDB: ${reservations.length}`);
    reservations.forEach((r, i) => {
      console.log(`  ${i + 1}. ID: ${r._id}, Habitación: ${r.roomId}, Estado: ${r.status}, Check-in: ${r.checkInDate}`);
    });
    
    // Neo4j
    const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), { encrypted: 'ENCRYPTION_OFF' });
    const session = driver.session();
    
    const userId = user._id.toString();
    const query = `
      MATCH (u:User {id: $userId})
      OPTIONAL MATCH (u)-[:RESERVÓ]->(res:Reservation)
      OPTIONAL MATCH (res)-[:RESERVADA_EN]->(room:Room)
      RETURN u, res, room
      ORDER BY res.checkInDate DESC
    `;
    
    const result = await session.run(query, { userId });
    console.log(`\n🕸️ Reservaciones en Neo4j: ${result.records.filter(r => r.get('res') !== null).length}`);
    
    result.records.forEach((record, i) => {
      const res = record.get('res');
      const room = record.get('room');
      if (res) {
        console.log(`  ${i + 1}. Reservación ID: ${res.properties.id}, Habitación: ${room ? room.properties.name : 'N/A'}, Estado: ${res.properties.status || 'N/A'}`);
      }
    });
    
    // Verificar relaciones
    const relQuery = `
      MATCH (u:User {id: $userId})-[r1:RESERVÓ]->(res:Reservation)-[r2:RESERVADA_EN]->(room:Room)
      RETURN count(r1) as userResRelations, count(r2) as resRoomRelations
    `;
    const relResult = await session.run(relQuery, { userId });
    const relRecord = relResult.records[0];
    console.log(`\n🔗 Relaciones en Neo4j:`);
    console.log(`  - Usuario -> Reservación: ${relRecord.get('userResRelations').toNumber()}`);
    console.log(`  - Reservación -> Habitación: ${relRecord.get('resRoomRelations').toNumber()}`);
    
    await session.close();
    await driver.close();
    await mongoose.disconnect();
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkReservations();
