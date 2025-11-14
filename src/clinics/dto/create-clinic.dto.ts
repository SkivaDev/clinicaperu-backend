import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';

const trimString = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim() : undefined;

const trimStringLower = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim().toLowerCase() : undefined;

export class CreateClinicDto {
  // ===========================================================================
  // 🏥 Información principal de la clínica
  // ==========================================================================='
  @ApiProperty({
    description: 'Nombre de la clínica',
    example: 'Clínica Perú Salud',
    minLength: 5,
    maxLength: 100,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  @Transform(trimString)
  name: string;

  @ApiProperty({
    description: 'Dirección física de la clínica',
    example: 'Av. Larco 123, Miraflores',
    minLength: 5,
    maxLength: 100,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  @Transform(trimString)
  address: string;

  // ===========================================================================
  // 🗺️ Ubigeo
  // ==========================================================================='
  @ApiProperty({
    description: 'Departamento (Ubigeo)',
    example: 'LIMA',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(trimString)
  ubigeoDept: string;

  @ApiProperty({
    description: 'Provincia (Ubigeo)',
    example: 'LIMA',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(trimString)
  ubigeoProv: string;

  @ApiProperty({
    description: 'Distrito (Ubigeo)',
    example: 'Miraflores',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(trimString)
  ubigeoDist: string;

  // ===========================================================================
  // ☎️ Contacto
  // ==========================================================================='
  @ApiPropertyOptional({
    description: 'Número telefónico de contacto (formato peruano)',
    example: '+51987654321',
  })
  @IsOptional()
  @IsString()
  @Matches(/^((\+51)?9\d{8})$/, {
    message: 'El teléfono debe ser un número móvil peruano válido',
  })
  @Transform(trimString)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico de contacto',
    example: 'contacto@clinicaperu.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido' })
  @Transform(trimStringLower)
  email?: string;

  // ===========================================================================
  // ⚙️ Configuración
  // ==========================================================================='
  @ApiPropertyOptional({
    description: 'Estado activo de la clínica',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
