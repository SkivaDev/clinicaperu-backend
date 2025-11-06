import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Gender } from '@prisma/client';

/**
 * DTO para crear un nuevo paciente desde el panel de administración
 */
export class CreatePatientDto {
  @ApiProperty({
    description: 'DNI del paciente (8 dígitos)',
    example: '12345678',
    minLength: 8,
    maxLength: 8,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(8)
  @Matches(/^\d{8}$/, { message: 'DNI must be exactly 8 digits' })
  dni: string;

  @ApiProperty({
    description: 'Email del paciente',
    example: 'juan.perez@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña del paciente',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Nombre del paciente',
    example: 'Juan',
  })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({
    description: 'Apellido del paciente',
    example: 'Pérez García',
  })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({
    description: 'Fecha de nacimiento (ISO 8601)',
    example: '1990-05-15',
  })
  @IsDateString()
  dayOfBirth: string;

  @ApiProperty({
    description: 'Teléfono del paciente',
    example: '+51987654321',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Género del paciente',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({
    description: 'URL de la imagen de perfil',
    example: 'https://example.com/profile.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  profileImage?: string;
}
