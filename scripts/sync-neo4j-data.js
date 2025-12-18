/**
 * Script para sincronizar datos de MongoDB a Neo4j
 * 
 * Uso:
 *   node scripts/sync-neo4j-data.js
 * 
 * Este script requiere que el backend esté corriendo y que tengas
 * un token JWT de un usuario con rol 'superadmin'
 */

const axios = require('axios');

// Configuración
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.JWT_TOKEN || '';

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

async function syncData() {
  logSection('🔄 SINCRONIZACIÓN DE DATOS A NEO4J');
  
  if (!JWT_TOKEN) {
    log('\n❌ Error: No se proporcionó un token JWT', 'red');
    log('\n💡 Para usar este script:', 'yellow');
    log('   1. Obtén un token JWT de un usuario con rol superadmin', 'yellow');
    log('   2. Ejecuta:', 'yellow');
    log('      JWT_TOKEN=tu_token node scripts/sync-neo4j-data.js', 'cyan');
    log('\n   O modifica el script y agrega tu token directamente.', 'yellow');
    process.exit(1);
  }
  
  try {
    log(`\n⏳ Conectando a: ${BACKEND_URL}`, 'yellow');
    log(`⏳ Sincronizando datos...`, 'yellow');
    
    const response = await axios.post(
      `${BACKEND_URL}/neo4j/sync/auto`,
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
      log(`   Usuarios: ${response.data.data.users}`, 'cyan');
      log(`   Habitaciones: ${response.data.data.rooms}`, 'cyan');
      log(`   Reservaciones: ${response.data.data.reservations}`, 'cyan');
      log(`\n✅ ${response.data.message}`, 'green');
      log(`\n🎉 Los datos ahora están disponibles en Neo4j!`, 'green');
      log(`\n💡 Puedes verificar con: npm run test:neo4j`, 'yellow');
    } else {
      log(`\n❌ Error: ${response.data.message}`, 'red');
      process.exit(1);
    }
    
  } catch (error) {
    logSection('❌ ERROR EN LA SINCRONIZACIÓN');
    
    if (error.response) {
      // Error de respuesta del servidor
      const status = error.response.status;
      const data = error.response.data;
      
      log(`\n❌ Error ${status}:`, 'red');
      log(`   ${data.message || JSON.stringify(data)}`, 'red');
      
      if (status === 401) {
        log(`\n💡 El token JWT es inválido o ha expirado.`, 'yellow');
        log(`   Obtén un nuevo token iniciando sesión como superadmin.`, 'yellow');
      } else if (status === 403) {
        log(`\n💡 No tienes permisos para ejecutar esta acción.`, 'yellow');
        log(`   Necesitas ser un usuario con rol 'superadmin'.`, 'yellow');
      } else if (status === 404) {
        log(`\n💡 El endpoint no existe. Verifica que el backend esté corriendo.`, 'yellow');
      }
    } else if (error.request) {
      // Error de conexión
      log(`\n❌ No se pudo conectar al backend:`, 'red');
      log(`   ${error.message}`, 'red');
      log(`\n💡 Verifica que:`, 'yellow');
      log(`   1. El backend esté corriendo en ${BACKEND_URL}`, 'yellow');
      log(`   2. La URL sea correcta`, 'yellow');
      log(`   3. No haya problemas de red o firewall`, 'yellow');
    } else {
      // Otro error
      log(`\n❌ Error: ${error.message}`, 'red');
    }
    
    process.exit(1);
  }
}

// Ejecutar sincronización
syncData().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

