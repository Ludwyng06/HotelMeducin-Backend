import { Controller, Post, Body, UseGuards, Get, Request, Put, Res, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '@services/auth.service';
import { LoginDto } from '@models/auth/dto/login.dto';
import { RegisterDto } from '@models/auth/dto/register.dto';
import { LoginWith2FADto } from '@models/auth/dto/login-with-2fa.dto';
import { TwoFactorVerifyDto } from '@models/auth/dto/two-factor-verify.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '@common/decorators/public.decorator';
import type { Response } from 'express';
import { GoogleOAuthGuard } from '@common/guards/google-oauth.guard';

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly configService: ConfigService,
	) {}

	@Public()
	@Post('register')
	register(@Body() registerDto: RegisterDto) {
		return this.authService.register(registerDto);
	}

	@Public()
	@Post('login')
	login(@Body() loginDto: LoginDto | LoginWith2FADto) {
		return this.authService.login(loginDto);
	}

	@Get('profile')
	getProfile(@Request() req) {
		return {
			success: true,
			data: req.user,
			message: 'Perfil obtenido exitosamente'
		};
	}

	@Put('profile')
	updateProfile(@Request() req, @Body() updateData: any) {
		return this.authService.updateProfile(req.user._id, updateData);
	}

	// 🔐 ENDPOINTS PARA 2FA

	@Post('2fa/setup')
	@UseGuards(JwtAuthGuard)
	setupTwoFactor(@Request() req) {
		const userId = req.user._id || req.user.sub;
		return this.authService.setupTwoFactor(userId);
	}

	@Post('2fa/verify')
	@UseGuards(JwtAuthGuard)
	verifyAndEnableTwoFactor(@Request() req, @Body() verifyDto: TwoFactorVerifyDto) {
		const userId = req.user._id || req.user.sub;
		return this.authService.verifyAndEnableTwoFactor(userId, verifyDto.code);
	}

	@Post('2fa/disable')
	@UseGuards(JwtAuthGuard)
	disableTwoFactor(@Request() req, @Body() verifyDto: TwoFactorVerifyDto) {
		const userId = req.user._id || req.user.sub;
		return this.authService.disableTwoFactor(userId, verifyDto.code);
	}

	// 🔐 ENDPOINTS PARA OAUTH 2.0 (GOOGLE)

	@Public()
	@Get('google')
	googleAuth(@Res() res: Response) {
		// Verificar si Google OAuth está configurado
		const clientID = this.configService.get<string>('GOOGLE_CLIENT_ID');
		const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
		
		if (!clientID || !clientSecret) {
			// Obtener la URL del frontend desde la configuración
			const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
			
			// Asegurarse de que la URL use el puerto correcto (4200)
			const correctedUrl = frontendUrl.replace(/:\d+/, ':4200').replace('localhost:3001', 'localhost:4200');
			
			return res.redirect(`${correctedUrl}/login?error=google_oauth_not_configured`);
		}

		// Si está configurado, redirigir al endpoint de Passport
		// Passport manejará la redirección a Google
		return res.redirect('/auth/google/passport');
	}

	@Public()
	@Get('google/passport')
	@UseGuards(GoogleOAuthGuard)
	googleAuthPassport() {
		// Este endpoint inicia el flujo de OAuth con Google
		// Passport redirige automáticamente a Google
	}

	@Public()
	@Get('google/callback')
	@UseGuards(GoogleOAuthGuard)
	async googleAuthCallback(@Req() req: any, @Res() res: Response) {
		// Usuario autenticado con Google viene aquí
		const user = req.user;
		
		if (!user) {
			const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
			return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
		}

		// Generar token JWT para el usuario
		const tokenData = this.authService.generateTokenForOAuthUser(user);
		
		// Redirigir al frontend con el token
		const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
		const token = tokenData.access_token;
		
		// Redirigir a una página del frontend que maneje el token
		return res.redirect(`${frontendUrl}/auth/google/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(tokenData.user))}`);
	}
}
