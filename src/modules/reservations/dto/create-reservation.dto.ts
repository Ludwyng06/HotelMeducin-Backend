import { IsString, IsNumber, IsDateString, IsOptional, IsArray, IsEnum, Min, ValidateNested, IsMongoId } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GuestDto {
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

  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  isMainGuest?: string;
}

export class CreateReservationDto {
  @IsString()
  userId: string;

  @IsString()
  roomId: string;

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @IsNumber()
  @Min(0)
  totalPrice: number;

  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'cancelled', 'completed'])
  status?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestDto)
  guests?: GuestDto[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  guestCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxCapacity?: number;
}
