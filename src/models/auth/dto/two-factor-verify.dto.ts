import { IsString, Length, Matches } from 'class-validator';

export class TwoFactorVerifyDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'El código debe ser un número de 6 dígitos' })
  code: string;
}

