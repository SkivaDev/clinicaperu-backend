import { Gender, Role } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  dni: string;

  @IsString()
  email: string;

  @IsString()
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsDateString()
  dayOfBirth: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsEnum(Role)
  role: Role;

  @IsString()
  profileImage?: string;
}
