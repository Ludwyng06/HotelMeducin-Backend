/**
 * Script para verificar el grafo en Neo4j
 */

const neo4j = require('neo4j-driver');
const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel_meducin_db';

async function checkGraph() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), { encrypted: 'ENCRYPTION_OFF' });
  const session = driver.session();
  
  try {
    console.log('\n📊 Verificando grafo en Neo4j...\n');
    
    // Verificar usuarios
    const usersResult = await session.run('MATCH (u:User) RETURN u.id as id, u.email as email, u.role as role');
    console.log('👥 Usuarios en Neo4j:');
    usersResult.records.forEach(r => {
      console.log(`  - ${r.get('email')} (ID: ${r.get('id')}, Rol: ${r.get('role')})`);
    });
    
    // Verificar reservaciones
    const reservationsResult = await session.run('MATCH (r:Reservation) RETURN r.id as id, r.checkInDate as checkIn, r.status as status LIMIT 10');
    console.log('\n📅 Reservaciones en Neo4j:');
    reservationsResult.records.forEach(r => {
      console.log(`  - Reservación ${r.get('id')} (CheckIn: ${r.get('checkIn')}, Status: ${r.get('status')})`);
    });
    
    // Verificar relaciones Usuario -> Reservación
    const userResResult = await session.run('MATCH (u:User)-[r:RESERVÓ]->(res:Reservation) RETURN u.id as userId, u.email as email, res.id as resId LIMIT 10');
    console.log('\n🔗 Relaciones Usuario -> Reservación:');
    if (userResResult.records.length === 0) {
      console.log('  ⚠️ NO HAY RELACIONES Usuario->Reservación');
    } else {
      userResResult.records.forEach(r => {
        console.log(`  - ${r.get('email')} (${r.get('userId')}) -> Reservación ${r.get('resId')}`);
      });
    }
    
    // Verificar relaciones Reservación -> Habitación
    const resRoomResult = await session.run('MATCH (res:Reservation)-[r:RESERVADA_EN]->(room:Room) RETURN res.id as resId, room.id as roomId, room.name as roomName LIMIT 10');
    console.log('\n🔗 Relaciones Reservación -> Habitación:');
    if (resRoomResult.records.length === 0) {
      console.log('  ⚠️ NO HAY RELACIONES Reservación->Habitación');
    } else {
      resRoomResult.records.forEach(r => {
        console.log(`  - Reservación ${r.get('resId')} -> ${r.get('roomName')} (${r.get('roomId')})`);
      });
    }
    
    // Verificar para un usuario específico
    if (usersResult.records.length > 0) {
      const firstUserId = usersResult.records[0].get('id');
      console.log(`\n🔍 Verificando grafo completo para usuario: ${firstUserId}`);
      
      const fullGraphQuery = `
        MATCH (u:User {id: $userId})
        OPTIONAL MATCH (u)-[r1:RESERVÓ]->(res:Reservation)
        OPTIONAL MATCH (res)-[r2:RESERVADA_EN]->(room:Room)
        RETURN u, res, room, r1, r2
      `;
      const fullGraphResult = await session.run(fullGraphQuery, { userId: firstUserId });
      
      console.log(`  Registros encontrados: ${fullGraphResult.records.length}`);
      let hasRes = false;
      let hasRoom = false;
      fullGraphResult.records.forEach((record, idx) => {
        const res = record.get('res');
        const room = record.get('room');
        if (res) hasRes = true;
        if (room) hasRoom = true;
        if (idx < 3) {
          console.log(`  Registro ${idx + 1}:`, {
            hasUser: !!record.get('u'),
            hasReservation: !!res,
            hasRoom: !!room,
            resId: res ? res.properties.id : null,
            roomId: room ? room.properties.id : null
          });
        }
      });
      console.log(`  Tiene reservaciones: ${hasRes}`);
      console.log(`  Tiene habitaciones: ${hasRoom}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

checkGraph();
