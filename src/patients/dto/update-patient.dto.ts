import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsBoolean,
  MinLength,
} from 'class-validator';
import { Gender } from '@prisma/client';

/**
 * DTO para actualizar un paciente desde el panel de administración
 */
export class UpdatePatientDto {
  @ApiProperty({
    description: 'Email del paciente',
    example: 'juan.perez@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Nombre del paciente',
    example: 'Juan',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @ApiProperty({
    description: 'Apellido del paciente',
    example: 'Pérez García',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @ApiProperty({
    description: 'Fecha de nacimiento (ISO 8601)',
    example: '1990-05-15',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dayOfBirth?: string;

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
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({
    description: 'URL de la imagen de perfil',
    example: 'https://example.com/profile.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  profileImage?: string;

  @ApiProperty({
    description: 'Estado activo del paciente',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
