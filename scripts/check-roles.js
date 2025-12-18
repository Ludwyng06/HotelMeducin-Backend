/**
 * Script para verificar roles en MongoDB y Neo4j
 */

const mongoose = require('mongoose');
const neo4j = require('neo4j-driver');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel_meducin_db';
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

async function checkRoles() {
  try {
    // MongoDB
    console.log('\n📊 Roles en MongoDB:');
    await mongoose.connect(MONGO_URI);
    const UserRole = mongoose.model('UserRole', new mongoose.Schema({}, { strict: false }), 'userroles');
    const roles = await UserRole.find({}).lean();
    roles.forEach(r => {
      console.log(`  - ${r.name} (${r._id})`);
    });
    
    // Neo4j
    console.log('\n📊 Usuarios en Neo4j con sus roles:');
    const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), { encrypted: 'ENCRYPTION_OFF' });
    const session = driver.session();
    const result = await session.run('MATCH (u:User) RETURN u.id as id, u.email as email, u.role as role');
    result.records.forEach(record => {
      console.log(`  - ${record.get('email')}: ${record.get('role')}`);
    });
    await session.close();
    await driver.close();
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkRoles();
