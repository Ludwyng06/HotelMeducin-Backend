import { IsString, IsEmail } from 'class-validator';

export class TwoFactorSetupDto {
  @IsEmail()
  email: string;
}

