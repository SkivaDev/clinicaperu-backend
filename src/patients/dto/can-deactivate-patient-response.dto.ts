import { ApiProperty } from '@nestjs/swagger';

export class CanDeactivatePatientResponseDto {
  @ApiProperty({ description: 'Indica si el paciente puede ser desactivado' })
  canDeactivate: boolean;

  @ApiProperty({
    description: 'Razones que impiden la desactivación',
    type: [String],
  })
  reasons: string[];

  @ApiProperty({
    description: 'Advertencias adicionales (no bloqueantes)',
    type: [String],
  })
  warnings: string[];

  @ApiProperty({
    description: 'Metadatos adicionales de la validación',
    example: {
      futureAppointments: 0,
    },
  })
  metadata: {
    futureAppointments: number;
  };
}
