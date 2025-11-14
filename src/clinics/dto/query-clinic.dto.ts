import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ClinicSortBy {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

const trimOptionalString = ({ value }: TransformFnParams) =>
  typeof value === 'string' ? value.trim() : undefined;

export class QueryClinicDto {
  // ---------------------------------------------------------
  // 🔍 Búsqueda
  // ---------------------------------------------------------
  @ApiPropertyOptional({
    description: 'Buscar por nombre o dirección de la clínica',
    example: 'Perú Salud',
  })
  @IsOptional()
  @IsString()
  @Transform(trimOptionalString)
  search?: string;

  // ---------------------------------------------------------
  // 🗺️ Ubigeo
  // ---------------------------------------------------------
  @ApiPropertyOptional({
    description: 'Filtrar por departamento (Ubigeo)',
    example: 'LIMA',
  })
  @IsOptional()
  @IsString()
  @Transform(trimOptionalString)
  ubigeoDept?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por provincia (Ubigeo)',
    example: 'LIMA',
  })
  @IsOptional()
  @IsString()
  @Transform(trimOptionalString)
  ubigeoProv?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por distrito (Ubigeo)',
    example: 'Miraflores',
  })
  @IsOptional()
  @IsString()
  @Transform(trimOptionalString)
  ubigeoDist?: string;

  // ---------------------------------------------------------
  // ✔ Estado
  // ---------------------------------------------------------
  @ApiPropertyOptional({
    description: 'Filtrar clínicas activas/inactivas',
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
    enum: ClinicSortBy,
    default: ClinicSortBy.NAME,
    description: 'Campo por el cual ordenar',
  })
  @IsOptional()
  @IsEnum(ClinicSortBy)
  sortBy?: ClinicSortBy = ClinicSortBy.NAME;

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
