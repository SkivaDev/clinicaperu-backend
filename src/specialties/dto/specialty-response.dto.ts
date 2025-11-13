// import { Doctor } from '@prisma/client';

// export class SpecialtyResponseDto {
//   id: string;
//   name: string;
//   description: string | null;
//   isActive: boolean;
//   createdAt: Date;
//   updatedAt: Date;
//   doctors?: Doctor[];
// }

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpecialtyResponseDto {
  @ApiProperty({ description: 'ID único de la especialidad' })
  id: string;

  @ApiProperty({ description: 'Nombre de la especialidad' })
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la especialidad' })
  description: string | null;

  @ApiProperty({ description: 'Estado de la especialidad' })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Cantidad de doctores asociados' })
  doctorsCount?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de doctores activos asociados',
  })
  activeDoctorsCount?: number;

  @ApiPropertyOptional({ description: 'Cantidad de citas futuras programadas' })
  upcomingAppointmentsCount?: number;
}

export class CanDeactivateResponseDto {
  @ApiProperty({
    description: 'Indica si la especialidad puede ser desactivada',
  })
  canDeactivate: boolean;

  @ApiProperty({
    description: 'Razones por las cuales no se puede desactivar',
    type: [String],
  })
  reasons: string[];

  @ApiProperty({
    description: 'Advertencias sobre la desactivación',
    type: [String],
  })
  warnings: string[];

  @ApiPropertyOptional({ description: 'Información adicional sobre doctores' })
  metadata?: {
    totalDoctors: number;
    activeDoctors: number;
    upcomingAppointments: number;
  };
}
