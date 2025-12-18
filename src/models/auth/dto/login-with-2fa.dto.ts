import { IsString, IsEmail, IsOptional, Length, Matches } from 'class-validator';

export class LoginWith2FADto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'El código 2FA debe ser un número de 6 dígitos' })
  twoFactorCode?: string;
}

