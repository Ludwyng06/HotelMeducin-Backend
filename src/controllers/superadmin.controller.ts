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
