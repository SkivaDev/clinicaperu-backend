import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryScheduleDto {
  @ApiPropertyOptional({
    description: 'ID del doctor para filtrar horarios',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @ApiPropertyOptional({
    description: 'Día de la semana (0=Domingo, 6=Sábado)',
    minimum: 0,
    maximum: 6,
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por estado activo/inactivo',
    example: true,
  })
  @IsOptional()
  @Transform(
    ({ value }: { value: string | boolean }) =>
      value === 'true' || value === true,
  )
  @IsBoolean()
  isActive?: boolean;
}
