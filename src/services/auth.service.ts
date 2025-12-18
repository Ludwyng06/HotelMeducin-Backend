import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Inject, forwardRef, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@services/users.service';
import { TwoFactorService } from '@services/two-factor.service';
import { Neo4jService } from '@services/neo4j.service';
import { LoginDto } from '@models/auth/dto/login.dto';
import { RegisterDto } from '@models/auth/dto/register.dto';
import { LoginWith2FADto } from '@models/auth/dto/login-with-2fa.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private twoFactorService: TwoFactorService,
    @Inject(forwardRef(() => Neo4jService))
    @Optional()
    private neo4jService?: Neo4jService,
  ) {}

  async register(registerDto: RegisterDto) {
    // 🔍 VALIDAR EMAIL DUPLICADO
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('El email ya está registrado en el sistema');
    }

    // 🔍 VALIDAR TELÉFONO DUPLICADO (si se proporciona)
    if (registerDto.phoneNumber) {
      const phoneExists = await this.usersService.checkPhoneExists(registerDto.phoneNumber);
      if (phoneExists) {
        throw new ConflictException(
          `El teléfono ${registerDto.phoneNumber} ya está registrado en el sistema`
        );
      }
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

  async login(loginDto: LoginDto | LoginWith2FADto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 🔐 Verificar si el usuario tiene 2FA activado
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // Si tiene 2FA activado pero no se proporcionó código, requerir código
      if (!('twoFactorCode' in loginDto) || !loginDto.twoFactorCode) {
        return {
          success: false,
          requiresTwoFactor: true,
          message: 'Se requiere código de autenticación de dos factores',
        };
      }

      // Verificar código 2FA
      const isCodeValid = this.twoFactorService.verifyToken(
        user.twoFactorSecret,
        loginDto.twoFactorCode,
      );

      if (!isCodeValid) {
        throw new UnauthorizedException('Código de autenticación de dos factores inválido');
      }
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
          twoFactorEnabled: user.twoFactorEnabled,
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
    
    // 🕸️ SINCRONIZAR AUTOMÁTICAMENTE CON NEO4J después de actualizar el perfil
    if (this.neo4jService) {
      try {
        const userObj = (updatedUser as any).toObject ? (updatedUser as any).toObject() : JSON.parse(JSON.stringify(updatedUser));
        await this.neo4jService.syncUsersFromMongo([userObj]);
        console.log('✅ [SYNC] Perfil sincronizado automáticamente con Neo4j');
      } catch (syncError) {
        // No fallar la actualización si falla la sincronización, solo loguear
        console.error('⚠️ [SYNC] Error sincronizando perfil con Neo4j:', syncError);
      }
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
        twoFactorEnabled: updatedUser.twoFactorEnabled,
      },
      message: 'Perfil actualizado exitosamente'
    };
  }

  // 🔐 MÉTODOS PARA 2FA

  /**
   * Configura 2FA para un usuario - genera secreto y QR code
   */
  async setupTwoFactor(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Generar secreto
    const secret = this.twoFactorService.generateSecret(user.email);
    
    // Guardar secreto temporalmente (sin activar 2FA aún)
    await this.usersService.update(userId, {
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false, // No activar hasta que se verifique
    });

    // Generar QR code
    const qrCodeUrl = await this.twoFactorService.generateQRCode(secret.otpauth_url);

    return {
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        otpauthUrl: secret.otpauth_url,
      },
      message: 'Configuración 2FA generada. Escanea el código QR con tu aplicación autenticadora.',
    };
  }

  /**
   * Verifica el código 2FA y activa 2FA para el usuario
   */
  async verifyAndEnableTwoFactor(userId: string, code: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Primero debes configurar 2FA');
    }

    // Verificar código
    const isValid = this.twoFactorService.verifyToken(user.twoFactorSecret, code);
    
    if (!isValid) {
      throw new UnauthorizedException('Código de verificación inválido');
    }

    // Activar 2FA
    await this.usersService.update(userId, {
      twoFactorEnabled: true,
    });

    return {
      success: true,
      message: 'Autenticación de dos factores activada exitosamente',
    };
  }

  /**
   * Desactiva 2FA para un usuario
   */
  async disableTwoFactor(userId: string, code: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA no está activado para este usuario');
    }

    // Verificar código antes de desactivar
    const isValid = this.twoFactorService.verifyToken(user.twoFactorSecret, code);
    
    if (!isValid) {
      throw new UnauthorizedException('Código de verificación inválido');
    }

    // Desactivar y limpiar secreto
    await this.usersService.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
    });

    return {
      success: true,
      message: 'Autenticación de dos factores desactivada exitosamente',
    };
  }

  // 🔐 MÉTODOS PARA OAUTH 2.0 (GOOGLE)

  /**
   * Valida o crea un usuario desde Google OAuth
   */
  async validateOrCreateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
  }) {
    const startTime = Date.now();
    
    // OPTIMIZACIÓN 1: Buscar por Google ID y email en paralelo (reduce latencia)
    const [userByGoogleId, userByEmail] = await Promise.all([
      this.usersService.findByGoogleId(googleUser.googleId),
      this.usersService.findByEmail(googleUser.email)
    ]);
    
    const searchTime = Date.now() - startTime;
    console.log(`⚡ [Google OAuth] Búsqueda de usuario completada en ${searchTime}ms`);
    
    // OPTIMIZACIÓN 2: Si existe por Google ID, actualizar solo si es necesario
    if (userByGoogleId) {
      const needsUpdate = 
        userByGoogleId.email !== googleUser.email || 
        userByGoogleId.firstName !== googleUser.firstName || 
        userByGoogleId.lastName !== googleUser.lastName;
      
      if (needsUpdate) {
        const updateStart = Date.now();
        const updated = await this.usersService.updateAndReturn(userByGoogleId._id.toString(), {
          email: googleUser.email,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
        });
        console.log(`⚡ [Google OAuth] Actualización de usuario completada en ${Date.now() - updateStart}ms`);
        console.log(`⚡ [Google OAuth] Total de validateOrCreateGoogleUser: ${Date.now() - startTime}ms`);
        return updated;
      }
      console.log(`⚡ [Google OAuth] Usuario encontrado por Google ID (sin actualización necesaria) - Total: ${Date.now() - startTime}ms`);
      return userByGoogleId;
    }

    // OPTIMIZACIÓN 3: Si existe por email, vincular Google ID en una sola operación
    if (userByEmail) {
      const linkStart = Date.now();
      const linked = await this.usersService.updateAndReturn(userByEmail._id.toString(), {
        googleId: googleUser.googleId,
        authProvider: 'google',
      });
      console.log(`⚡ [Google OAuth] Vinculación de Google ID completada en ${Date.now() - linkStart}ms`);
      console.log(`⚡ [Google OAuth] Total de validateOrCreateGoogleUser: ${Date.now() - startTime}ms`);
      return linked;
    }

    // OPTIMIZACIÓN 4: Crear usuario sin hashear password (ahorra ~100ms)
    // Para usuarios OAuth, el password no se usa, así que no lo hasheamos
    const createStart = Date.now();
    const newUser = await this.usersService.create({
      email: googleUser.email,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
      // No proporcionar password - el método create ya maneja esto para OAuth
      googleId: googleUser.googleId,
      authProvider: 'google',
    } as any);
    
    console.log(`⚡ [Google OAuth] Creación de nuevo usuario completada en ${Date.now() - createStart}ms`);
    console.log(`⚡ [Google OAuth] Total de validateOrCreateGoogleUser: ${Date.now() - startTime}ms`);

    return newUser;
  }

  /**
   * Genera JWT token para usuario de Google OAuth
   */
  generateTokenForOAuthUser(user: any) {
    const payload = { 
      email: user.email, 
      sub: user._id, 
      role: (user.roleId as any)?.name || 'user',
      roleId: user.roleId?._id 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: (user.roleId as any)?.name || 'user',
        roleId: user.roleId?._id,
        phoneNumber: user.phoneNumber,
        authProvider: user.authProvider || 'local',
        twoFactorEnabled: user.twoFactorEnabled || false,
      },
    };
  }
}
