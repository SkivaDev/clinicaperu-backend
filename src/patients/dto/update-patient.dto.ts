import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Gender } from '@prisma/client';

/**
 * DTO para actualizar un paciente desde el panel de administración
 */
const toTrimmedString = (params: TransformFnParams): string | undefined => {
  if (typeof params.value !== 'string') {
    return undefined;
  }
  const trimmed = params.value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toNormalizedEmail = (params: TransformFnParams): string | undefined => {
  if (typeof params.value !== 'string') {
    return undefined;
  }
  const normalized = params.value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
};

export class UpdatePatientDto {
  @ApiPropertyOptional({
    description: 'DNI del paciente (8 dígitos)',
    example: '12345678',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(8)
  @Matches(/^\d{8}$/, { message: 'DNI must be exactly 8 digits' })
  @Transform(toTrimmedString)
  dni?: string;

  @ApiPropertyOptional({
    description: 'Email del paciente',
    example: 'juan.perez@example.com',
  })
  @IsOptional()
  @IsEmail()
  @Transform(toNormalizedEmail)
  email?: string;

  @ApiPropertyOptional({
    description: 'Nombre del paciente',
    example: 'Juan',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @Transform(toTrimmedString)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Apellido del paciente',
    example: 'Pérez García',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @Transform(toTrimmedString)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Fecha de nacimiento (ISO 8601)',
    example: '1990-05-15',
  })
  @IsOptional()
  @IsDateString()
  dayOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Teléfono del paciente',
    example: '+51987654321',
  })
  @IsOptional()
  @IsString()
  @Transform(toTrimmedString)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Género del paciente',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    description: 'URL de la imagen de perfil',
    example: 'https://example.com/profile.jpg',
  })
  @IsOptional()
  @IsString()
  @Transform(toTrimmedString)
  profileImage?: string;

  @ApiPropertyOptional({
    description: 'Estado activo del paciente',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
