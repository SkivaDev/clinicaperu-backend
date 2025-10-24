import { IsDate, IsOptional, IsString, MinDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnavailabilityDto {
  @ApiProperty({
    description: 'Fecha y hora de inicio del período no disponible',
    example: '2025-12-24T00:00:00Z',
    type: Date,
  })
  @Type(() => Date)
  @IsDate()
  @MinDate(new Date(), {
    message: 'La fecha de inicio debe ser en el futuro',
  })
  startAt: Date;

  @ApiProperty({
    description: 'Fecha y hora de fin del período no disponible',
    example: '2025-12-26T23:59:59Z',
    type: Date,
  })
  @Type(() => Date)
  @IsDate()
  endAt: Date;

  @ApiPropertyOptional({
    description: 'Razón de la no disponibilidad (vacaciones, emergencia, etc.)',
    example: 'Vacaciones de fin de año',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
