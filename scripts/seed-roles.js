/**
 * Script para crear los roles por defecto del sistema
 * 
 * Uso:
 *   node scripts/seed-roles.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// URI de MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel_meducin_db';

// Esquema simplificado para UserRole
const UserRoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  permissions: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}, { timestamps: true, collection: 'userroles' });

const UserRole = mongoose.model('UserRole', UserRoleSchema);

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

// Roles por defecto
const defaultRoles = [
  {
    name: 'superadmin',
    description: 'Super Administrador con acceso completo al sistema',
    permissions: [
      'create_users', 'read_users', 'update_users', 'delete_users',
      'create_admins', 'read_admins', 'update_admins', 'delete_admins',
      'create_rooms', 'read_rooms', 'update_rooms', 'delete_rooms',
      'create_reservations', 'read_reservations', 'update_reservations', 'delete_reservations',
      'view_reports', 'manage_system'
    ],
    isActive: true
  },
  {
    name: 'admin',
    description: 'Administrador del hotel con acceso a reportes y gestión',
    permissions: [
      'read_users', 'update_users',
      'create_rooms', 'read_rooms', 'update_rooms', 'delete_rooms',
      'create_reservations', 'read_reservations', 'update_reservations', 'delete_reservations',
      'view_reports', 'manage_hotel'
    ],
    isActive: true
  },
  {
    name: 'user',
    description: 'Usuario regular del hotel',
    permissions: [
      'read_own_profile', 'update_own_profile',
      'create_reservations', 'read_own_reservations', 'update_own_reservations', 'cancel_own_reservations',
      'read_rooms', 'read_room_categories'
    ],
    isActive: true
  },
  {
    name: 'recepcionista',
    description: 'Recepcionista del hotel con acceso a confirmar reservas',
    permissions: [
      'read_reservations', 'update_reservations', 'confirm_reservations',
      'read_users', 'read_rooms', 'read_guests',
      'view_reception_dashboard'
    ],
    isActive: true
  }
];

async function seedRoles() {
  try {
    log('\n🌱 Iniciando seeding de roles...', 'cyan');
    
    // Conectar a MongoDB
    log(`📡 Conectando a MongoDB: ${MONGO_URI}`, 'blue');
    await mongoose.connect(MONGO_URI);
    log('✅ Conectado a MongoDB', 'green');
    
    // Verificar roles existentes
    log('\n📋 Verificando roles existentes...', 'blue');
    const existingRoles = await UserRole.find({}).lean();
    log(`   Encontrados ${existingRoles.length} roles existentes`, 'cyan');
    
    if (existingRoles.length > 0) {
      existingRoles.forEach(role => {
        log(`   - ${role.name}`, 'yellow');
      });
    }
    
    // Crear o actualizar roles
    log('\n📝 Creando/actualizando roles...', 'blue');
    let created = 0;
    let updated = 0;
    
    for (const roleData of defaultRoles) {
      const existingRole = await UserRole.findOne({ name: roleData.name });
      
      if (existingRole) {
        // Actualizar rol existente
        await UserRole.updateOne(
          { name: roleData.name },
          {
            description: roleData.description,
            permissions: roleData.permissions,
            isActive: true
          }
        );
        log(`   ✓ Rol actualizado: ${roleData.name}`, 'green');
        updated++;
      } else {
        // Crear nuevo rol
        const role = new UserRole(roleData);
        await role.save();
        log(`   ✓ Rol creado: ${roleData.name}`, 'green');
        created++;
      }
    }
    
    // Verificar resultados
    const finalRoles = await UserRole.find({}).lean();
    log(`\n✅ Seeding completado!`, 'green');
    log(`   - ${created} roles creados`, 'cyan');
    log(`   - ${updated} roles actualizados`, 'cyan');
    log(`   - Total de roles: ${finalRoles.length}`, 'cyan');
    
    log('\n📊 Roles finales:', 'blue');
    finalRoles.forEach(role => {
      log(`   - ${role.name}: ${role.description}`, 'cyan');
    });
    
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
seedRoles();
