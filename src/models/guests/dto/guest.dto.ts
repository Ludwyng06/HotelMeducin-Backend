import { IsString, IsEmail, IsDateString, IsBoolean, IsMongoId, IsOptional } from 'class-validator';

export class CreateGuestDto {
  @IsMongoId()
  reservationId: string;

  @IsOptional()
  @IsBoolean()
  isMainGuest?: boolean;

  @IsMongoId()
  documentType: string;

  @IsString()
  documentNumber: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsDateString()
  birthDate: string;

  @IsString()
  nationality: string;

  @IsString()
  phoneNumber: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

export class UpdateGuestDto {
  @IsOptional()
  @IsMongoId()
  documentType?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
