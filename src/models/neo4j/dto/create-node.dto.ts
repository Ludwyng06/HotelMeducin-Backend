import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateNodeDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsObject()
  @IsOptional()
  properties?: Record<string, any>;
}

