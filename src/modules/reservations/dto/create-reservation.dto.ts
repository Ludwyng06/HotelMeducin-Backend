import { IsString, IsNumber, IsDateString, IsOptional, IsArray, IsEnum, Min } from 'class-validator';
import { Transform } from 'class-transformer';

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
}
