/**
 * Script para verificar reservaciones en Neo4j
 */

const neo4j = require('neo4j-driver');
const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel_meducin_db';

async function checkReservations() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), { encrypted: 'ENCRYPTION_OFF' });
  const session = driver.session();
  
  try {
    console.log('\n📊 Verificando reservaciones en Neo4j...\n');
    
    // Conectar a MongoDB
    await mongoose.connect(MONGO_URI);
    const Reservation = mongoose.model('Reservation', new mongoose.Schema({}, { strict: false }), 'reservations');
    
    // Obtener todas las reservaciones de MongoDB
    const mongoReservations = await Reservation.find().lean().limit(10);
    console.log(`📅 Reservaciones en MongoDB: ${mongoReservations.length}`);
    mongoReservations.forEach(r => {
      console.log(`  - ID: ${r._id}, CheckIn: ${r.checkInDate}, Status: ${r.status}`);
    });
    
    // Obtener todas las reservaciones de Neo4j
    const neo4jReservations = await session.run('MATCH (r:Reservation) RETURN r.id as id, r.checkInDate as checkIn, r.status as status ORDER BY r.checkInDate DESC LIMIT 10');
    console.log(`\n📅 Reservaciones en Neo4j: ${neo4jReservations.records.length}`);
    neo4jReservations.records.forEach(r => {
      console.log(`  - ID: ${r.get('id')}, CheckIn: ${r.get('checkIn')}, Status: ${r.get('status')}`);
    });
    
    // Verificar relaciones
    const relationships = await session.run('MATCH (u:User)-[r:RESERVÓ]->(res:Reservation) RETURN u.email as email, res.id as resId, res.checkInDate as checkIn ORDER BY res.checkInDate DESC LIMIT 10');
    console.log(`\n🔗 Relaciones Usuario->Reservación: ${relationships.records.length}`);
    relationships.records.forEach(r => {
      console.log(`  - ${r.get('email')} -> Reservación ${r.get('resId')} (${r.get('checkIn')})`);
    });
    
    // Verificar reservaciones de hoy
    const today = new Date().toISOString().split('T')[0];
    const todayReservations = await session.run(
      'MATCH (u:User)-[r:RESERVÓ]->(res:Reservation) WHERE res.checkInDate STARTS WITH $today RETURN u.email as email, res.id as resId, res.checkInDate as checkIn',
      { today }
    );
    console.log(`\n📅 Reservaciones de HOY (${today}): ${todayReservations.records.length}`);
    todayReservations.records.forEach(r => {
      console.log(`  - ${r.get('email')} -> Reservación ${r.get('resId')} (${r.get('checkIn')})`);
    });
    
    // Comparar MongoDB vs Neo4j
    const mongoIds = new Set(mongoReservations.map(r => r._id.toString()));
    const neo4jIds = new Set(neo4jReservations.records.map(r => r.get('id')));
    
    const missingInNeo4j = [...mongoIds].filter(id => !neo4jIds.has(id));
    if (missingInNeo4j.length > 0) {
      console.log(`\n⚠️ Reservaciones en MongoDB pero NO en Neo4j: ${missingInNeo4j.length}`);
      missingInNeo4j.forEach(id => console.log(`  - ${id}`));
    } else {
      console.log(`\n✅ Todas las reservaciones están sincronizadas`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await session.close();
    await driver.close();
    await mongoose.disconnect();
  }
}

checkReservations();
