/**
 * Script para sincronizar SOLO las reservaciones del día actual con Neo4j
 * 
 * Uso:
 *   node scripts/sync-today-reservations.js
 * 
 * O con token JWT:
 *   JWT_TOKEN=tu_token node scripts/sync-today-reservations.js
 */

require('dotenv').config();
const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.JWT_TOKEN || '';

function log(message, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
  };
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + title, 'bright');
  console.log('='.repeat(60));
}

async function syncTodayReservations() {
  logSection('🔄 SINCRONIZACIÓN DE RESERVACIONES DEL DÍA ACTUAL A NEO4J');
  
  if (!JWT_TOKEN) {
    log('\n❌ Error: No se proporcionó un token JWT', 'red');
    log('\n💡 Para usar este script:', 'yellow');
    log('   1. Obtén un token JWT de un usuario con rol admin o superadmin', 'yellow');
    log('   2. Ejecuta:', 'yellow');
    log('      JWT_TOKEN=tu_token node scripts/sync-today-reservations.js', 'cyan');
    log('\n   O modifica el script y agrega tu token directamente.', 'yellow');
    process.exit(1);
  }
  
  try {
    log(`\n⏳ Conectando a: ${BACKEND_URL}`, 'yellow');
    log(`⏳ Sincronizando reservaciones del día actual...`, 'yellow');
    
    const response = await axios.post(
      `${BACKEND_URL}/neo4j/sync/reservations-today`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      logSection('✅ SINCRONIZACIÓN EXITOSA');
      log(`\n📊 Resultados:`, 'green');
      log(`   Reservaciones sincronizadas: ${response.data.data.reservations}`, 'cyan');
      log(`\n📈 Por estado:`, 'cyan');
      Object.entries(response.data.data.reservationsByStatus || {}).forEach(([status, count]) => {
        log(`   ${status}: ${count}`, 'cyan');
      });
      log(`\n✅ ${response.data.message}`, 'green');
      log(`\n🎉 Los estados ahora están actualizados en Neo4j!`, 'green');
      log(`\n💡 Recarga el dashboard para ver el grafo actualizado.`, 'yellow');
    } else {
      log(`\n❌ Error: ${response.data.message}`, 'red');
      process.exit(1);
    }
    
  } catch (error) {
    logSection('❌ ERROR EN LA SINCRONIZACIÓN');
    if (error.response) {
      log(`\n❌ Error HTTP ${error.response.status}: ${error.response.statusText}`, 'red');
      log(`\n📄 Respuesta:`, 'yellow');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      log(`\n❌ No se pudo conectar al servidor: ${BACKEND_URL}`, 'red');
      log(`\n💡 Verifica que el servidor esté corriendo.`, 'yellow');
    } else {
      log(`\n❌ Error: ${error.message}`, 'red');
    }
    process.exit(1);
  }
}

syncTodayReservations();

