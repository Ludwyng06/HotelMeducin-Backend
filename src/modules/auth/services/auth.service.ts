import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/services/users.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new UnauthorizedException('El usuario ya existe');
    }

    const user = await this.usersService.create(registerDto);
    const payload = { 
      email: user.email, 
      sub: user._id, 
      role: (user.roleId as any)?.name || 'user',
      roleId: user.roleId?._id 
    };
    
    return {
      success: true,
      data: {
        access_token: this.jwtService.sign(payload),
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: (user.roleId as any)?.name || 'user',
          roleId: user.roleId?._id,
          phoneNumber: user.phoneNumber,
        },
      },
      message: 'Usuario registrado exitosamente',
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { 
      email: user.email, 
      sub: user._id, 
      role: (user.roleId as any)?.name || 'user',
      roleId: user.roleId?._id 
    };
    
    return {
      success: true,
      data: {
        access_token: this.jwtService.sign(payload),
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: (user.roleId as any)?.name || 'user',
          roleId: user.roleId?._id,
          phoneNumber: user.phoneNumber,
        },
      },
      message: 'Inicio de sesión exitoso',
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async updateProfile(userId: string, updateData: any) {
    const updatedUser = await this.usersService.update(userId, updateData);
    if (!updatedUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    
    return {
      success: true,
      data: {
        _id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: (updatedUser.roleId as any)?.name || 'user',
        roleId: updatedUser.roleId?._id,
        phoneNumber: updatedUser.phoneNumber,
      },
      message: 'Perfil actualizado exitosamente'
    };
  }
}
