import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({
    description: 'DNI del usuario',
    example: '12345678',
    minLength: 8,
    maxLength: 8
  })
  @IsString()
  @IsNotEmpty()
  @Length(8)
  dni: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'usuario@example.com',
    format: 'email'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan'
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Pérez'
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'MiContraseña123!',
    minLength: 8
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Fecha de nacimiento en formato ISO 8601',
    example: '1990-01-15T00:00:00Z',
    format: 'date-time'
  })
  @IsDateString()
  @IsNotEmpty()
  dayOfBirth: string; // Formato ISO 8601 (yyyy-MM-dd) "2004-01-25T00:00:00Z"

  @ApiPropertyOptional({
    description: 'Número de teléfono del usuario',
    example: '+51987654321'
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Género del usuario',
    enum: Gender,
    example: Gender.MALE
  })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({
    description: 'URL de la imagen de perfil del usuario',
    example: 'https://example.com/profile.jpg'
  })
  @IsString()
  @IsOptional()
  profileImage?: string;

  //   @IsOptional()
  //   @IsString()
  //   @IsNotEmpty()
  //   address?: string; // Si se quiere agregar un campo opcional para la dirección

  // Esto no es necesario si lo maneja en la base de datos automáticamente
}
