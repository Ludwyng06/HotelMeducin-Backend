import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateDocumentTypeDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsString()
  validationPattern: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDocumentTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  validationPattern?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
