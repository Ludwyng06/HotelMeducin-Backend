import { IsEmail, IsString, IsOptional, IsEnum, MinLength, IsMongoId } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsMongoId()
  roleId?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
