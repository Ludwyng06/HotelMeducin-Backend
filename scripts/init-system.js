const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/hotel_meducin_db');

// Esquemas
const userRoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  permissions: [{ type: String }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  password: { type: String, required: true },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRole', required: true },
  phoneNumber: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const UserRole = mongoose.model('UserRole', userRoleSchema);
const User = mongoose.model('User', userSchema);

async function initializeSystem() {
  try {
    console.log('🚀 Inicializando sistema de roles...');

    // 1. Crear roles por defecto
    const existingRoles = await UserRole.countDocuments();
    
    if (existingRoles === 0) {
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
        }
      ];

      await UserRole.insertMany(defaultRoles);
      console.log('✅ Roles creados exitosamente');
    } else {
      console.log('✅ Roles ya existen');
    }

    // 2. Crear superadministrador por defecto
    const existingSuperadmin = await User.findOne({ email: 'superadmin@hotel.com' });
    
    if (!existingSuperadmin) {
      const superadminRole = await UserRole.findOne({ name: 'superadmin' });
      const hashedPassword = await bcrypt.hash('superadmin123', 10);
      
      const superadmin = new User({
        email: 'superadmin@hotel.com',
        firstName: 'Super',
        lastName: 'Administrador',
        password: hashedPassword,
        roleId: superadminRole._id,
        phoneNumber: '+1234567890',
        isActive: true
      });

      await superadmin.save();
      console.log('✅ Superadministrador creado exitosamente');
      console.log('📧 Email: superadmin@hotel.com');
      console.log('🔑 Password: superadmin123');
    } else {
      console.log('✅ Superadministrador ya existe');
    }

    // 3. Migrar usuarios existentes
    const usersToMigrate = await User.find({ roleId: { $exists: false } });
    const userRole = await UserRole.findOne({ name: 'user' });
    const adminRole = await UserRole.findOne({ name: 'admin' });

    for (const user of usersToMigrate) {
      const roleId = user.role === 'admin' ? adminRole._id : userRole._id;
      
      await User.findByIdAndUpdate(user._id, { 
        roleId,
        $unset: { role: 1 }
      });
    }

    if (usersToMigrate.length > 0) {
      console.log(`✅ Migrados ${usersToMigrate.length} usuarios a nueva estructura`);
    }

    console.log('🎉 Sistema inicializado exitosamente');
    
  } catch (error) {
    console.error('❌ Error inicializando sistema:', error);
  } finally {
    mongoose.connection.close();
  }
}

initializeSystem();
