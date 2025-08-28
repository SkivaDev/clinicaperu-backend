import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Length(8)
  dni: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  names: string;

  @IsString()
  @IsNotEmpty()
  fatherSurname: string;

  @IsString()
  @IsNotEmpty()
  motherSurname: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsDateString()
  @IsNotEmpty()
  dayOfBirth: string; // Formato ISO 8601 (yyyy-MM-dd) "2004-01-25T00:00:00Z"

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(Gender)
  gender: Gender;

  //   @IsOptional()
  //   @IsString()
  //   @IsNotEmpty()
  //   address?: string; // Si se quiere agregar un campo opcional para la dirección

  // Esto no es necesario si lo maneja en la base de datos automáticamente
}
