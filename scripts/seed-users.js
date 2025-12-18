/**
 * Script para crear usuarios de ejemplo para cada rol
 * 
 * Uso:
 *   node scripts/seed-users.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// URI de MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel_meducin_db';

// Esquemas simplificados
const UserRoleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  permissions: { type: [String], default: [] },
  isActive: { type: Boolean, default: true }
}, { strict: false, collection: 'userroles' });

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  password: { type: String },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRole', required: true },
  phoneNumber: { type: String },
  isActive: { type: Boolean, default: true },
  authProvider: { type: String, default: 'local' }
}, { strict: false, collection: 'users' });

const UserRole = mongoose.model('UserRole', UserRoleSchema);
const User = mongoose.model('User', UserSchema);

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

// Usuarios de ejemplo para cada rol
const exampleUsers = [
  {
    email: 'superadmin@hotelmeducin.com',
    firstName: 'Super',
    lastName: 'Administrador',
    roleName: 'superadmin',
    phoneNumber: '+57 300 000 0001'
  },
  {
    email: 'admin@hotelmeducin.com',
    firstName: 'Admin',
    lastName: 'Hotel',
    roleName: 'admin',
    phoneNumber: '+57 300 000 0002'
  },
  {
    email: 'recepcionista@hotelmeducin.com',
    firstName: 'Recepcionista',
    lastName: 'Principal',
    roleName: 'recepcionista',
    phoneNumber: '+57 300 000 0003'
  },
  {
    email: 'usuario@hotelmeducin.com',
    firstName: 'Usuario',
    lastName: 'Ejemplo',
    roleName: 'user',
    phoneNumber: '+57 300 000 0004'
  }
];

const PASSWORD = '123456'; // Contraseña del 1 al 6

async function seedUsers() {
  try {
    log('\n🌱 Iniciando seeding de usuarios...', 'cyan');
    
    // Conectar a MongoDB
    log(`📡 Conectando a MongoDB: ${MONGO_URI}`, 'blue');
    await mongoose.connect(MONGO_URI);
    log('✅ Conectado a MongoDB', 'green');
    
    // Obtener roles
    log('\n📋 Obteniendo roles...', 'blue');
    const roles = await UserRole.find({}).lean();
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name] = role._id;
    });
    
    log(`   Encontrados ${roles.length} roles:`, 'cyan');
    roles.forEach(role => {
      log(`   - ${role.name}`, 'yellow');
    });
    
    // Crear usuarios
    log('\n👥 Creando usuarios de ejemplo...', 'blue');
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    let created = 0;
    let updated = 0;
    
    for (const userData of exampleUsers) {
      const roleId = roleMap[userData.roleName];
      
      if (!roleId) {
        log(`   ⚠️ Rol '${userData.roleName}' no encontrado, omitiendo usuario ${userData.email}`, 'yellow');
        continue;
      }
      
      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        // Actualizar usuario existente
        await User.updateOne(
          { email: userData.email },
          {
            firstName: userData.firstName,
            lastName: userData.lastName,
            password: hashedPassword,
            roleId: roleId,
            phoneNumber: userData.phoneNumber,
            isActive: true,
            authProvider: 'local'
          }
        );
        log(`   ✓ Usuario actualizado: ${userData.email} (rol: ${userData.roleName})`, 'green');
        updated++;
      } else {
        // Crear nuevo usuario
        const user = new User({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          password: hashedPassword,
          roleId: roleId,
          phoneNumber: userData.phoneNumber,
          isActive: true,
          authProvider: 'local'
        });
        
        await user.save();
        log(`   ✓ Usuario creado: ${userData.email} (rol: ${userData.roleName})`, 'green');
        created++;
      }
    }
    
    // Verificar resultados
    const finalUsers = await User.find({}).populate('roleId').lean();
    log(`\n✅ Seeding completado!`, 'green');
    log(`   - ${created} usuarios creados`, 'cyan');
    log(`   - ${updated} usuarios actualizados`, 'cyan');
    log(`   - Total de usuarios: ${finalUsers.length}`, 'cyan');
    
    log('\n📊 Usuarios creados para cada rol:', 'blue');
    log('\n🔐 Credenciales de acceso:', 'cyan');
    log('═'.repeat(60), 'cyan');
    exampleUsers.forEach(userData => {
      const roleId = roleMap[userData.roleName];
      if (roleId) {
        log(`\n📧 Email: ${userData.email}`, 'yellow');
        log(`   Contraseña: ${PASSWORD}`, 'yellow');
        log(`   Rol: ${userData.roleName}`, 'yellow');
        log(`   Nombre: ${userData.firstName} ${userData.lastName}`, 'yellow');
      }
    });
    log('\n' + '═'.repeat(60), 'cyan');
    
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
seedUsers();
