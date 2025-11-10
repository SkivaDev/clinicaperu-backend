import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum CalendarViewEnum {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
}

export class DashboardFiltersDto {
  @ApiPropertyOptional({
    description: 'ID de la especialidad para filtrar',
    example: 'specialty-uuid',
  })
  @IsOptional()
  @IsString()
  specialtyId?: string;

  @ApiPropertyOptional({
    description: 'ID de la clínica para filtrar',
    example: 'clinic-uuid',
  })
  @IsOptional()
  @IsString()
  clinicId?: string;

  @ApiPropertyOptional({
    description: 'Fecha de inicio para buscar disponibilidad (ISO 8601)',
    example: '2024-11-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'ID del doctor (activa modo calendario con todos los slots)',
    example: 'doctor-uuid',
  })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional({
    description: 'Vista del calendario (solo aplica con doctorId)',
    enum: CalendarViewEnum,
    example: CalendarViewEnum.WEEK,
  })
  @IsOptional()
  @IsEnum(CalendarViewEnum)
  view?: CalendarViewEnum;
}
