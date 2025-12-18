/**
 * Script de prueba de conexión a Neo4j
 * 
 * Uso:
 *   node scripts/test-neo4j-connection.js
 *   npm run test:neo4j
 * 
 * O con variables de entorno personalizadas:
 *   NEO4J_URI=bolt://localhost:7687 NEO4J_USER=neo4j NEO4J_PASSWORD=tu_password node scripts/test-neo4j-connection.js
 */

const neo4j = require('neo4j-driver');

// Intentar cargar dotenv si está disponible
try {
  require('dotenv').config({ path: '.env' });
} catch (e) {
  // dotenv no está instalado, usar variables de entorno del sistema
}

// Configuración desde variables de entorno o valores por defecto
const config = {
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'neo4j123',
  database: process.env.NEO4J_DATABASE || 'neo4j'
};

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

async function testConnection() {
  logSection('🔌 PRUEBA DE CONEXIÓN A NEO4J');
  
  log(`\n📋 Configuración:`, 'cyan');
  log(`   URI: ${config.uri}`);
  log(`   Usuario: ${config.user}`);
  log(`   Base de datos: ${config.database}`);
  log(`   Contraseña: ${'*'.repeat(config.password.length)}`);
  
  let driver = null;
  
  try {
    // Crear driver
    log(`\n⏳ Creando driver de Neo4j...`, 'yellow');
    driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.user, config.password),
      {
        encrypted: 'ENCRYPTION_OFF',
        trust: 'TRUST_ALL_CERTIFICATES',
      }
    );
    
    // Verificar conectividad
    log(`⏳ Verificando conectividad...`, 'yellow');
    await driver.verifyConnectivity();
    log(`✅ Conexión exitosa a Neo4j!`, 'green');
    
    // Obtener información del servidor
    logSection('📊 INFORMACIÓN DEL SERVIDOR');
    const serverInfo = await driver.getServerInfo();
    log(`   Versión: ${serverInfo.version}`, 'cyan');
    log(`   Protocolo: ${serverInfo.protocolVersion}`, 'cyan');
    
    // Crear sesión y ejecutar consultas de prueba
    const session = driver.session({ database: config.database });
    
    try {
      // Prueba 1: Consulta simple
      logSection('🧪 PRUEBA 1: Consulta Simple');
      const result1 = await session.run('RETURN 1 as test');
      const record = result1.records[0];
      log(`✅ Consulta ejecutada correctamente`, 'green');
      log(`   Resultado: ${record.get('test')}`, 'cyan');
      
      // Prueba 2: Contar nodos
      logSection('📊 PRUEBA 2: Conteo de Nodos');
      const nodeCounts = await session.run(`
        MATCH (n)
        RETURN labels(n) as label, count(n) as count
        ORDER BY count DESC
      `);
      
      if (nodeCounts.records.length === 0) {
        log(`⚠️  No hay nodos en la base de datos`, 'yellow');
        log(`   La base de datos está vacía. Necesitas sincronizar datos desde MongoDB.`, 'yellow');
      } else {
        log(`✅ Nodos encontrados:`, 'green');
        nodeCounts.records.forEach(record => {
          const labels = record.get('label');
          const label = labels && labels.length > 0 ? labels[0] : 'Sin etiqueta';
          const count = record.get('count').toNumber();
          log(`   ${label}: ${count} nodos`, 'cyan');
        });
      }
      
      // Prueba 3: Contar relaciones
      logSection('🔗 PRUEBA 3: Conteo de Relaciones');
      const relCounts = await session.run(`
        MATCH ()-[r]->()
        RETURN type(r) as type, count(r) as count
        ORDER BY count DESC
      `);
      
      if (relCounts.records.length === 0) {
        log(`⚠️  No hay relaciones en la base de datos`, 'yellow');
      } else {
        log(`✅ Relaciones encontradas:`, 'green');
        relCounts.records.forEach(record => {
          const type = record.get('type');
          const count = record.get('count').toNumber();
          log(`   ${type}: ${count} relaciones`, 'cyan');
        });
      }
      
      // Prueba 4: Verificar estructura del grafo del hotel
      logSection('🏨 PRUEBA 4: Estructura del Grafo del Hotel');
      
      // Verificar usuarios
      const userCount = await session.run('MATCH (u:User) RETURN count(u) as count');
      const users = userCount.records[0].get('count').toNumber();
      log(`   Usuarios: ${users}`, users > 0 ? 'green' : 'yellow');
      
      // Verificar habitaciones
      const roomCount = await session.run('MATCH (r:Room) RETURN count(r) as count');
      const rooms = roomCount.records[0].get('count').toNumber();
      log(`   Habitaciones: ${rooms}`, rooms > 0 ? 'green' : 'yellow');
      
      // Verificar reservaciones
      const resCount = await session.run('MATCH (res:Reservation) RETURN count(res) as count');
      const reservations = resCount.records[0].get('count').toNumber();
      log(`   Reservaciones: ${reservations}`, reservations > 0 ? 'green' : 'yellow');
      
      // Verificar relaciones
      const userResRel = await session.run('MATCH (u:User)-[:RESERVÓ]->(res:Reservation) RETURN count(*) as count');
      const userResCount = userResRel.records[0].get('count').toNumber();
      log(`   Relaciones Usuario->Reservación: ${userResCount}`, userResCount > 0 ? 'green' : 'yellow');
      
      const roomResRel = await session.run('MATCH (r:Room)<-[:RESERVADA_EN]-(res:Reservation) RETURN count(*) as count');
      const roomResCount = roomResRel.records[0].get('count').toNumber();
      log(`   Relaciones Habitación->Reservación: ${roomResCount}`, roomResCount > 0 ? 'green' : 'yellow');
      
      // Prueba 5: Ejemplo de consulta compleja
      if (users > 0 && reservations > 0) {
        logSection('🔍 PRUEBA 5: Consulta Compleja (Top Usuarios)');
        const topUsers = await session.run(`
          MATCH (u:User)-[:RESERVÓ]->(res:Reservation)
          RETURN u.email as email, u.firstName as firstName, count(res) as totalReservations
          ORDER BY totalReservations DESC
          LIMIT 5
        `);
        
        if (topUsers.records.length > 0) {
          log(`✅ Top usuarios con más reservaciones:`, 'green');
          topUsers.records.forEach((record, index) => {
            const email = record.get('email');
            const firstName = record.get('firstName');
            const count = record.get('totalReservations').toNumber();
            log(`   ${index + 1}. ${firstName || 'N/A'} (${email}): ${count} reservaciones`, 'cyan');
          });
        }
      }
      
      // Resumen final
      logSection('📋 RESUMEN');
      const totalNodes = await session.run('MATCH (n) RETURN count(n) as count');
      const totalRels = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
      
      log(`   Total de nodos: ${totalNodes.records[0].get('count').toNumber()}`, 'cyan');
      log(`   Total de relaciones: ${totalRels.records[0].get('count').toNumber()}`, 'cyan');
      
      if (users === 0 && rooms === 0 && reservations === 0) {
        log(`\n⚠️  ADVERTENCIA: La base de datos está vacía.`, 'yellow');
        log(`   Para sincronizar datos, ejecuta:`, 'yellow');
        log(`   POST http://localhost:3000/neo4j/sync/auto`, 'yellow');
        log(`   (Requiere autenticación como superadmin)`, 'yellow');
      } else {
        log(`\n✅ La base de datos contiene datos sincronizados.`, 'green');
      }
      
    } finally {
      await session.close();
    }
    
    logSection('✅ PRUEBA COMPLETADA EXITOSAMENTE');
    log(`\n🎉 Neo4j está configurado y funcionando correctamente!`, 'green');
    
  } catch (error) {
    logSection('❌ ERROR DE CONEXIÓN');
    log(`\n❌ Error al conectar con Neo4j:`, 'red');
    log(`   ${error.message}`, 'red');
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      log(`\n💡 Soluciones:`, 'yellow');
      log(`   1. Verifica que Neo4j esté corriendo:`, 'yellow');
      log(`      docker ps | grep neo4j`, 'cyan');
      log(`   2. Inicia Neo4j con Docker:`, 'yellow');
      log(`      docker-compose up -d neo4j`, 'cyan');
      log(`   3. Verifica que el puerto 7687 esté disponible`, 'yellow');
      log(`   4. Espera unos segundos después de iniciar Neo4j (puede tardar en arrancar)`, 'yellow');
    } else if (error.message.includes('authentication') || error.message.includes('Unauthorized')) {
      log(`\n💡 Soluciones:`, 'yellow');
      log(`   1. Verifica las credenciales en .env:`, 'yellow');
      log(`      NEO4J_USER=neo4j`, 'cyan');
      log(`      NEO4J_PASSWORD=neo4j123`, 'cyan');
      log(`   2. Si es la primera vez, cambia la contraseña en:`, 'yellow');
      log(`      http://localhost:7474`, 'cyan');
      log(`   3. La contraseña por defecto en Docker es: neo4j123`, 'yellow');
    } else if (error.message.includes('timeout')) {
      log(`\n💡 Soluciones:`, 'yellow');
      log(`   1. Neo4j puede estar iniciando, espera unos segundos más`, 'yellow');
      log(`   2. Verifica los logs: docker logs hotel-neo4j`, 'cyan');
    }
    
    process.exit(1);
  } finally {
    if (driver) {
      await driver.close();
      log(`\n🔌 Conexión cerrada.`, 'cyan');
    }
  }
}

// Ejecutar prueba
testConnection().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

