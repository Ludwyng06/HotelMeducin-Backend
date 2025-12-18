import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '@models/users/user.schema';
import { UserRole, UserRoleDocument } from '@models/users/user-role.schema';
import { CreateUserDto } from '@models/users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserRole.name) private userRoleModel: Model<UserRoleDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // 🔍 VALIDAR TELÉFONO DUPLICADO antes de crear
    if (createUserDto.phoneNumber) {
      const phoneExists = await this.checkPhoneExists(createUserDto.phoneNumber);
      if (phoneExists) {
        throw new ConflictException(
          `El teléfono ${createUserDto.phoneNumber} ya está registrado en el sistema`
        );
      }
    }

    // Solo hashear password si se proporciona (no requerido para OAuth)
    const hashedPassword = createUserDto.password 
      ? await bcrypt.hash(createUserDto.password, 10)
      : undefined;

    // Asegurar roleId por defecto: 'user'
    let resolvedRoleId = createUserDto.roleId as any;
    if (!resolvedRoleId) {
      let defaultRole = await this.userRoleModel.findOne({ name: 'user', isActive: true });
      if (!defaultRole) {
        // Intentar encontrar aunque no tenga isActive
        defaultRole = await this.userRoleModel.findOne({ name: 'user' });
      }
      if (!defaultRole) {
        // Crear rol básico 'user' si no existe
        defaultRole = await this.userRoleModel.create({
          name: 'user',
          description: 'Usuario estándar',
          isActive: true,
        } as Partial<UserRole> as any);
      }
      resolvedRoleId = defaultRole._id;
    }

    try {
      const userData: any = {
        ...createUserDto,
        roleId: resolvedRoleId,
      };
      
      // Solo agregar password si existe (para usuarios OAuth no es necesario)
      if (hashedPassword) {
        userData.password = hashedPassword;
      }
      
      const createdUser = new this.userModel(userData);

      const saved = await createdUser.save();
      // Devolver con roleId poblado para consumo inmediato
      await saved.populate('roleId');
      return saved;
    } catch (error: any) {
      // Manejar errores de MongoDB por violación de índices únicos
      if (error.code === 11000) {
        const duplicateField = Object.keys(error.keyPattern || {})[0];
        let message = 'Ya existe un registro con este valor';
        
        if (duplicateField === 'email') {
          message = `El email ${createUserDto.email} ya está registrado en el sistema`;
        } else if (duplicateField === 'phoneNumber') {
          message = `El teléfono ${createUserDto.phoneNumber} ya está registrado en el sistema`;
        }
        
        throw new ConflictException(message);
      }
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().populate('roleId').exec();
  }

  async findOne(id: string): Promise<User | null> {
    return this.userModel.findById(id).populate('roleId').exec();
  }

  async findByEmail(email: string, populateRole = true): Promise<User | null> {
    const query = this.userModel.findOne({ email });
    if (populateRole) {
      query.populate('roleId');
    }
    return query.exec();
  }

  async findByGoogleId(googleId: string, populateRole = true): Promise<User | null> {
    const query = this.userModel.findOne({ googleId });
    if (populateRole) {
      query.populate('roleId');
    }
    return query.exec();
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    return this.userModel.findOne({ phoneNumber }).populate('roleId').exec();
  }

  async checkPhoneExists(phoneNumber: string): Promise<boolean> {
    if (!phoneNumber) return false;
    const user = await this.userModel.findOne({ phoneNumber }).exec();
    return !!user;
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(id, updateData, { new: true }).populate('roleId').exec();
  }

  // Método optimizado que actualiza y retorna en una sola consulta (evita consulta adicional)
  async updateAndReturn(id: string, updateData: Partial<User>): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('roleId')
      .exec();
  }

  async remove(id: string): Promise<User | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  // Métodos específicos para roles
  async findByRole(roleName: string): Promise<User[]> {
    const role = await this.userRoleModel.findOne({ name: roleName, isActive: true });
    if (!role) return [];
    return this.userModel.find({ roleId: role._id }).populate('roleId').exec();
  }

  async findByRoleId(roleId: string): Promise<User[]> {
    const objectId = new Types.ObjectId(roleId);
    return this.userModel.find({ roleId: objectId }).populate('roleId').exec();
  }

  async getAdmins(): Promise<User[]> {
    return this.findByRole('admin');
  }

  async getSuperAdmins(): Promise<User[]> {
    return this.findByRole('superadmin');
  }

  async getUsers(): Promise<User[]> {
    return this.findByRole('user');
  }

  // Migrar usuarios existentes
  async migrateExistingUsers(): Promise<void> {
    const users = await this.userModel.find({ roleId: { $exists: false } }).exec();
    const userRole = await this.userRoleModel.findOne({ name: 'user' });
    const adminRole = await this.userRoleModel.findOne({ name: 'admin' });

    if (!userRole || !adminRole) {
      console.log('❌ Roles no encontrados para migración');
      return;
    }

    for (const user of users) {
      // Si el usuario tiene role: 'admin', asignar roleId de admin
      // Si no, asignar roleId de user
      const roleId = (user as any).role === 'admin' ? adminRole._id : userRole._id;
      
      await this.userModel.findByIdAndUpdate(user._id, { 
        roleId,
        $unset: { role: 1 } // Eliminar el campo role antiguo
      });
    }

    console.log(`✅ Migrados ${users.length} usuarios a nueva estructura`);
  }
}
