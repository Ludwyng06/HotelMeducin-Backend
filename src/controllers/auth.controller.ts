import { Controller, Post, Body, UseGuards, Get, Request, Put } from '@nestjs/common';
import { AuthService } from '@services/auth.service';
import { LoginDto } from '@models/auth/dto/login.dto';
import { RegisterDto } from '@models/auth/dto/register.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('register')
	register(@Body() registerDto: RegisterDto) {
		return this.authService.register(registerDto);
	}

	@Post('login')
	login(@Body() loginDto: LoginDto) {
		return this.authService.login(loginDto);
	}

	@UseGuards(JwtAuthGuard)
	@Get('profile')
	getProfile(@Request() req) {
		return {
			success: true,
			data: req.user,
			message: 'Perfil obtenido exitosamente'
		};
	}

	@UseGuards(JwtAuthGuard)
	@Put('profile')
	updateProfile(@Request() req, @Body() updateData: any) {
		return this.authService.updateProfile(req.user._id, updateData);
	}
}
