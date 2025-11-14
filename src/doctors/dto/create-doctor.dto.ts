// import { IsBoolean, IsInt, IsOptional, IsString, IsNumber } from 'class-validator';
// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// export class CreateDoctorDto {
//   @ApiProperty({
//     description: 'Número de colegiatura médica profesional',
//     example: 12345,
//     type: 'integer'
//   })
//   @IsInt()
//   cmp: number;

//   @ApiPropertyOptional({
//     description: 'Estado activo del doctor',
//     example: true,
//     default: true
//   })
//   @IsBoolean()
//   @IsOptional()
//   isActive: boolean;

//   @ApiPropertyOptional({
//     description: 'Años de experiencia del doctor',
//     example: 5,
//     type: 'number'
//   })
//   @IsNumber()
//   @IsOptional()
//   yearsOfExperience: number;

//   @ApiPropertyOptional({
//     description: 'Precio de consulta del doctor',
//     example: 150.00,
//     type: 'number'
//   })
//   @IsNumber()
//   @IsOptional()
//   consultationPrice: number;

//   @ApiProperty({
//     description: 'ID de la especialidad del doctor',
//     example: 'uuid-specialty-id'
//   })
//   @IsString()
//   specialtyId: string;

//   @ApiProperty({
//     description: 'ID de la clínica donde trabaja el doctor',
//     example: 'uuid-clinic-id'
//   })
//   @IsString()
//   clinicId: string;
// }

import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsNumber,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

export class CreateDoctorDto {
  // ===========================================================================
  // 👤 DATOS DEL USUARIO ASOCIADO
  // ===========================================================================
  @ApiProperty({
    description: 'Nombre del doctor',
    example: 'Juan',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres' })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({
    description: 'Apellido del doctor',
    example: 'Pérez',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El apellido no puede exceder 50 caracteres' })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiProperty({
    description: 'Contraseña del doctor',
    minLength: 8,
    maxLength: 50,
    example: 'Doctor123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(50, { message: 'La contraseña no puede exceder 50 caracteres' })
  @Transform(({ value }) => value?.trim())
  password: string;

  @ApiProperty({
    description: 'Correo electrónico del doctor',
    example: 'doctor@mail.com',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @ApiProperty({
    description: 'Número de DNI del doctor',
    example: '12345678',
    minLength: 8,
    maxLength: 12,
  })
  @IsString()
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
  @MinLength(8, { message: 'El DNI debe tener al menos 8 caracteres' })
  @MaxLength(12, { message: 'El DNI no debe exceder los 12 caracteres' })
  @Transform(({ value }) => value?.trim())
  dni: string;

  @ApiPropertyOptional({
    description: 'Número telefónico del doctor',
    example: '+51 987 654 321',
    minLength: 6,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'El teléfono debe tener al menos 6 caracteres' })
  @MaxLength(20, { message: 'El teléfono no debe exceder 20 caracteres' })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiProperty({
    description: 'Fecha de nacimiento del doctor en formato ISO 8601',
    example: '1990-05-10',
  })
  @IsDateString(
    {},
    {
      message:
        'La fecha de nacimiento debe tener un formato ISO válido (YYYY-MM-DD).',
    },
  )
  dayOfBirth: string;

  @ApiProperty({
    description: 'Género del doctor',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsNotEmpty()
  @IsString()
  gender: Gender;

  // ===========================================================================
  // 🧑‍⚕️ DATOS PROFESIONALES DEL DOCTOR
  // ===========================================================================
  @ApiProperty({
    description: 'Código CMP del doctor (único y obligatorio)',
    example: 12345,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'El CMP debe ser un número positivo' })
  cmp: number;

  @ApiPropertyOptional({
    description: 'Años de experiencia del doctor',
    example: 8,
    minimum: 0,
    maximum: 60,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  yearsOfExperience?: number;

  @ApiPropertyOptional({
    description: 'Precio de la consulta',
    example: 150,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  consultationPrice?: number;

  // ===========================================================================
  // 🏥 ASIGNACIONES
  // ===========================================================================
  @ApiProperty({
    description: 'ID de la especialidad médica',
    example: 'uuid-specialty',
  })
  @IsString()
  @IsUUID('4', { message: 'El ID de la especialidad debe ser un UUID válido' })
  specialtyId: string;

  @ApiProperty({
    description: 'ID de la clínica donde trabaja el doctor',
    example: 'uuid-clinic',
  })
  @IsString()
  @IsUUID('4', { message: 'El ID de la clínica debe ser un UUID válido' })
  clinicId: string;

  // ===========================================================================
  // ⚙️ ESTADO
  // ===========================================================================
  @ApiPropertyOptional({
    description: 'Estado del doctor (activo por defecto)',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
