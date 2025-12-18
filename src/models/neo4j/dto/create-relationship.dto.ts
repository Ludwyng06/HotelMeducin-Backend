import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateRelationshipDto {
  @IsString()
  @IsNotEmpty()
  fromLabel: string;

  @IsString()
  @IsNotEmpty()
  fromId: string;

  @IsString()
  @IsNotEmpty()
  relationshipType: string;

  @IsString()
  @IsNotEmpty()
  toLabel: string;

  @IsString()
  @IsNotEmpty()
  toId: string;

  @IsObject()
  @IsOptional()
  properties?: Record<string, any>;
}

