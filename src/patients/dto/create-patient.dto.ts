import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
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
const toTrimmedString = ({ value }: TransformFnParams): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

const toNormalizedEmail = ({
  value,
}: TransformFnParams): string | undefined => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : undefined;
  }
  return undefined;
};

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
  @Transform(toTrimmedString)
  dni: string;

  @ApiProperty({
    description: 'Email del paciente',
    example: 'juan.perez@example.com',
  })
  @IsEmail()
  @Transform(toNormalizedEmail)
  email: string;

  @ApiProperty({
    description: 'Contraseña del paciente',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Transform(toTrimmedString)
  password: string;

  @ApiProperty({
    description: 'Nombre del paciente',
    example: 'Juan',
  })
  @IsString()
  @MinLength(2)
  @Transform(toTrimmedString)
  firstName: string;

  @ApiProperty({
    description: 'Apellido del paciente',
    example: 'Pérez García',
  })
  @IsString()
  @MinLength(2)
  @Transform(toTrimmedString)
  lastName: string;

  @ApiProperty({
    description: 'Fecha de nacimiento (ISO 8601)',
    example: '1990-05-15',
  })
  @IsDateString()
  dayOfBirth: string;

  @ApiPropertyOptional({
    description: 'Teléfono del paciente',
    example: '+51987654321',
  })
  @IsOptional()
  @IsString()
  @Transform(toTrimmedString)
  phone?: string;

  @ApiProperty({
    description: 'Género del paciente',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({
    description: 'URL de la imagen de perfil',
    example: 'https://example.com/profile.jpg',
  })
  @IsOptional()
  @IsString()
  @Transform(toTrimmedString)
  profileImage?: string;
}
