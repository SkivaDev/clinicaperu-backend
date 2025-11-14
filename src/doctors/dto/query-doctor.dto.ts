import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DoctorSortBy {
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
  CMP = 'cmp',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class QueryDoctorDto {
  // ---------------------------------------------------------
  // 🔍 Search
  // ---------------------------------------------------------
  @ApiPropertyOptional({
    description: 'Buscar por nombre, apellido o CMP',
    example: 'Perez',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  // ---------------------------------------------------------
  // 🔢 CMP
  // ---------------------------------------------------------
  @ApiPropertyOptional({
    description: 'Filtrar por CMP (código de colegiatura)',
    example: 12345,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cmp?: number;

  // ---------------------------------------------------------
  // 🩺 Especialidad
  // ---------------------------------------------------------
  @ApiPropertyOptional({
    description: 'Filtrar por ID de especialidad',
    example: 'specialty-uuid-here',
  })
  @IsOptional()
  @IsString()
  specialtyId?: string;

  // ---------------------------------------------------------
  // 🏥 Clínica
  // ---------------------------------------------------------
  @ApiPropertyOptional({
    description: 'Filtrar por ID de clínica',
    example: 'clinic-uuid-here',
  })
  @IsOptional()
  @IsString()
  clinicId?: string;

  // ---------------------------------------------------------
  // ✔ Estado
  // ---------------------------------------------------------
  @ApiPropertyOptional({
    description: 'Filtrar doctores activos/inactivos',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  // ---------------------------------------------------------
  // ↕ Ordenamiento
  // ---------------------------------------------------------
  @ApiPropertyOptional({
    enum: DoctorSortBy,
    default: DoctorSortBy.LAST_NAME,
    description: 'Campo por el cual ordenar',
  })
  @IsOptional()
  @IsEnum(DoctorSortBy)
  sortBy?: DoctorSortBy = DoctorSortBy.LAST_NAME;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'asc',
    description: 'Orden ascendente o descendente',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';

  // ---------------------------------------------------------
  // 📄 Paginación
  // ---------------------------------------------------------
  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
    description: 'Número de página',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 10,
    description: 'Cantidad de registros por página',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
