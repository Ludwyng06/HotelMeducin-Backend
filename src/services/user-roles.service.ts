import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRole, UserRoleDocument } from '@models/users/user-role.schema';

@Injectable()
export class UserRolesService {
  constructor(
    @InjectModel(UserRole.name) private userRoleModel: Model<UserRoleDocument>,
  ) {}

  async create(createUserRoleDto: any): Promise<UserRole> {
    const userRole = new this.userRoleModel(createUserRoleDto);
    return userRole.save();
  }

  async findAll(): Promise<UserRole[]> {
    return this.userRoleModel.find({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<UserRole | null> {
    return this.userRoleModel.findById(id).exec();
  }

  async findByName(name: string): Promise<UserRole | null> {
    return this.userRoleModel.findOne({ name, isActive: true }).exec();
  }

  async update(id: string, updateUserRoleDto: any): Promise<UserRole | null> {
    return this.userRoleModel.findByIdAndUpdate(id, updateUserRoleDto, { new: true }).exec();
  }

  async remove(id: string): Promise<UserRole | null> {
    return this.userRoleModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
  }

  // Inicializar roles por defecto
  async initializeDefaultRoles(): Promise<void> {
    const existingRoles = await this.userRoleModel.countDocuments();
    
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

      await this.userRoleModel.insertMany(defaultRoles);
      console.log('✅ Roles por defecto inicializados');
    }
  }
}
