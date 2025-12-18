import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { UserRolesService } from '../services/user-roles.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';

@Controller('superadmin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
export class SuperadminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userRolesService: UserRolesService,
  ) {}

  // Dashboard del superadmin
  @Get('dashboard')
  async getDashboard() {
    const [admins, users, roles] = await Promise.all([
      this.usersService.getAdmins(),
      this.usersService.getUsers(),
      this.userRolesService.findAll()
    ]);

    return {
      success: true,
      data: {
        admins: admins.length,
        users: users.length,
        roles: roles.length,
        totalUsers: admins.length + users.length
      },
      message: 'Dashboard del superadministrador'
    };
  }

  // CRUD de Administradores
  @Get('admins')
  async getAdmins() {
    const admins = await this.usersService.getAdmins();
    return {
      success: true,
      data: admins,
      message: 'Administradores obtenidos exitosamente'
    };
  }

  @Post('admins')
  async createAdmin(@Body() createAdminDto: any) {
    // Buscar el rol de admin
    const adminRole = await this.userRolesService.findByName('admin');
    if (!adminRole) {
      throw new Error('Rol de administrador no encontrado');
    }

    const adminData = {
      ...createAdminDto,
      roleId: adminRole._id
    };

    const admin = await this.usersService.create(adminData);
    return {
      success: true,
      data: admin,
      message: 'Administrador creado exitosamente'
    };
  }

  @Get('admins/:id')
  async getAdmin(@Param('id') id: string) {
    const admin = await this.usersService.findOne(id);
    if (!admin || (admin.roleId as any)?.name !== 'admin') {
      throw new Error('Administrador no encontrado');
    }
    return {
      success: true,
      data: admin,
      message: 'Administrador obtenido exitosamente'
    };
  }

  @Patch('admins/:id')
  async updateAdmin(@Param('id') id: string, @Body() updateAdminDto: any) {
    const admin = await this.usersService.findOne(id);
    if (!admin || (admin.roleId as any)?.name !== 'admin') {
      throw new Error('Administrador no encontrado');
    }

    const updatedAdmin = await this.usersService.update(id, updateAdminDto);
    return {
      success: true,
      data: updatedAdmin,
      message: 'Administrador actualizado exitosamente'
    };
  }

  @Delete('admins/:id')
  async deleteAdmin(@Param('id') id: string) {
    const admin = await this.usersService.findOne(id);
    if (!admin || (admin.roleId as any)?.name !== 'admin') {
      throw new Error('Administrador no encontrado');
    }

    await this.usersService.remove(id);
    return {
      success: true,
      message: 'Administrador eliminado exitosamente'
    };
  }

  // CRUD de Recepcionistas
  @Get('recepcionistas')
  @Roles('admin', 'superadmin')
  async getRecepcionistas() {
    // Primero asegurarse de que los roles por defecto estén inicializados
    await this.userRolesService.initializeDefaultRoles();
    
    // Buscar el rol sin filtrar por isActive
    const recepcionistaRole = await this.userRolesService.findByNameIgnoreActive('recepcionista');
    if (!recepcionistaRole) {
      console.log('⚠️ Rol recepcionista no encontrado');
      return {
        success: true,
        data: [],
        message: 'Recepcionistas obtenidos exitosamente'
      };
    }
    
    console.log(`🔍 Buscando recepcionistas con roleId: ${recepcionistaRole._id}`);
    const recepcionistas = await this.usersService.findByRoleId(recepcionistaRole._id.toString());
    console.log(`📋 Recepcionistas encontrados: ${recepcionistas.length}`);
    
    return {
      success: true,
      data: recepcionistas,
      message: 'Recepcionistas obtenidos exitosamente'
    };
  }

  @Post('recepcionistas')
  @Roles('admin', 'superadmin')
  async createRecepcionista(@Body() createRecepcionistaDto: any) {
    // Primero asegurarse de que los roles por defecto estén inicializados
    await this.userRolesService.initializeDefaultRoles();
    
    // Buscar el rol de recepcionista (sin filtrar por isActive)
    let recepcionistaRole = await this.userRolesService.findByNameIgnoreActive('recepcionista');
    
    // Si no existe o está inactivo, crearlo o reactivarlo
    if (!recepcionistaRole) {
      recepcionistaRole = await this.userRolesService.create({
        name: 'recepcionista',
        description: 'Recepcionista del hotel con acceso a confirmar reservas',
        permissions: [
          'read_reservations', 'update_reservations', 'confirm_reservations',
          'read_users', 'read_rooms', 'read_guests',
          'view_reception_dashboard'
        ],
        isActive: true
      });
      console.log('✅ Rol recepcionista creado automáticamente');
    } else if (!recepcionistaRole.isActive) {
      // Si existe pero está inactivo, reactivarlo
      recepcionistaRole = await this.userRolesService.update(recepcionistaRole._id.toString(), { isActive: true });
      console.log('✅ Rol recepcionista reactivado');
    }

    if (!recepcionistaRole) {
      throw new Error('No se pudo obtener o crear el rol de recepcionista');
    }

    const recepcionistaData = {
      ...createRecepcionistaDto,
      roleId: recepcionistaRole._id
    };

    const recepcionista = await this.usersService.create(recepcionistaData);
    return {
      success: true,
      data: recepcionista,
      message: 'Recepcionista creado exitosamente'
    };
  }

  @Get('recepcionistas/:id')
  @Roles('admin', 'superadmin')
  async getRecepcionista(@Param('id') id: string) {
    const recepcionista = await this.usersService.findOne(id);
    if (!recepcionista || (recepcionista.roleId as any)?.name !== 'recepcionista') {
      throw new Error('Recepcionista no encontrado');
    }
    return {
      success: true,
      data: recepcionista,
      message: 'Recepcionista obtenido exitosamente'
    };
  }

  @Patch('recepcionistas/:id')
  @Roles('admin', 'superadmin')
  async updateRecepcionista(@Param('id') id: string, @Body() updateRecepcionistaDto: any) {
    const recepcionista = await this.usersService.findOne(id);
    if (!recepcionista || (recepcionista.roleId as any)?.name !== 'recepcionista') {
      throw new Error('Recepcionista no encontrado');
    }

    const updatedRecepcionista = await this.usersService.update(id, updateRecepcionistaDto);
    return {
      success: true,
      data: updatedRecepcionista,
      message: 'Recepcionista actualizado exitosamente'
    };
  }

  @Delete('recepcionistas/:id')
  @Roles('admin', 'superadmin')
  async deleteRecepcionista(@Param('id') id: string) {
    const recepcionista = await this.usersService.findOne(id);
    if (!recepcionista || (recepcionista.roleId as any)?.name !== 'recepcionista') {
      throw new Error('Recepcionista no encontrado');
    }

    await this.usersService.remove(id);
    return {
      success: true,
      message: 'Recepcionista eliminado exitosamente'
    };
  }

  // Gestión de Roles
  @Get('roles')
  async getRoles() {
    const roles = await this.userRolesService.findAll();
    return {
      success: true,
      data: roles,
      message: 'Roles obtenidos exitosamente'
    };
  }

  // Inicializar sistema
  @Post('init-system')
  async initializeSystem() {
    await this.userRolesService.initializeDefaultRoles();
    await this.usersService.migrateExistingUsers();
    
    return {
      success: true,
      message: 'Sistema inicializado exitosamente'
    };
  }
}
