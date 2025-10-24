import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UnavailabilityResponseDto {
  @ApiProperty({
    description: 'ID único del período de no disponibilidad',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Fecha y hora de inicio',
    example: '2025-12-24T00:00:00Z',
  })
  startAt: Date;

  @ApiProperty({
    description: 'Fecha y hora de fin',
    example: '2025-12-26T23:59:59Z',
  })
  endAt: Date;

  @ApiPropertyOptional({
    description: 'Razón de la no disponibilidad',
    example: 'Vacaciones de fin de año',
  })
  reason?: string | null;

  @ApiProperty({
    description: 'ID del doctor',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  doctorId: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2025-10-23T19:00:00Z',
  })
  createdAt?: Date;
}
