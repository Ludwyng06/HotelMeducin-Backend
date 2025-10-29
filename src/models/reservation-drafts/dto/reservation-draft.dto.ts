import { IsString, IsEmail, IsDateString, IsBoolean, IsMongoId, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GuestDraftDto {
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

export class CreateReservationDraftDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  roomId: string;

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @IsNumber()
  guestCount: number;

  @IsNumber()
  maxCapacity: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestDraftDto)
  guests: GuestDraftDto[];

  @IsNumber()
  totalPrice: number;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}

export class UpdateReservationDraftDto {
  @IsOptional()
  @IsDateString()
  checkInDate?: string;

  @IsOptional()
  @IsDateString()
  checkOutDate?: string;

  @IsOptional()
  @IsNumber()
  guestCount?: number;

  @IsOptional()
  @IsNumber()
  maxCapacity?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestDraftDto)
  guests?: GuestDraftDto[];

  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}
