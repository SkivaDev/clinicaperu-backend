import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({
    description: 'ID del doctor (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  doctorId: string;

  @ApiProperty({
    description: 'Día de la semana (0=Domingo, 6=Sábado)',
    minimum: 0,
    maximum: 6,
    example: 1,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({
    description: 'Hora de inicio en formato HH:mm (24 horas)',
    example: '09:00',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime debe estar en formato HH:mm (ej: 09:00)',
  })
  startTime: string;

  @ApiProperty({
    description: 'Hora de fin en formato HH:mm (24 horas)',
    example: '13:00',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime debe estar en formato HH:mm (ej: 13:00)',
  })
  endTime: string;

  @ApiProperty({
    description: 'Duración de cada slot en minutos',
    enum: [15, 20, 30, 45, 60],
    example: 30,
  })
  @IsInt()
  @Min(15)
  @Max(120)
  slotMinutes: number;

  @ApiPropertyOptional({
    description: 'Fecha desde la cual el horario es efectivo',
    example: '2025-01-01T00:00:00Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;

  @ApiPropertyOptional({
    description: 'Fecha hasta la cual el horario es efectivo',
    example: '2025-12-31T23:59:59Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date;

  @ApiPropertyOptional({
    description: 'Estado del horario (activo/inactivo)',
    default: true,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
