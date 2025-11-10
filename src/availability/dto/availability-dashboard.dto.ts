import { ApiProperty } from '@nestjs/swagger';

export class NextAvailableSlotDto {
  @ApiProperty({ example: 'slot-uuid' })
  id: string;

  @ApiProperty({ example: '2024-11-15T09:00:00.000Z' })
  startAt: string;

  @ApiProperty({ example: '2024-11-15T09:30:00.000Z' })
  endAt: string;
}

export class DoctorWithSlotsDto {
  @ApiProperty({ example: 'doctor-uuid' })
  id: string;

  @ApiProperty({ example: 12345 })
  cmp: number;

  @ApiProperty({ example: 150.0, nullable: true })
  consultationPrice: number | null;

  @ApiProperty({ example: 4.8, nullable: true })
  rating: number | null;

  @ApiProperty({
    example: {
      firstName: 'Juan',
      lastName: 'Pérez',
      profileImage: 'https://example.com/image.jpg',
    },
  })
  user: {
    firstName: string;
    lastName: string;
    profileImage: string | null;
  };

  @ApiProperty({
    example: { id: 'specialty-uuid', name: 'Cardiología' },
  })
  specialty: {
    id: string;
    name: string;
  };

  @ApiProperty({
    example: { id: 'clinic-uuid', name: 'Clínica San Juan' },
  })
  clinic: {
    id: string;
    name: string;
  };

  @ApiProperty({
    type: [NextAvailableSlotDto],
    description: 'Próximos 5 slots disponibles',
  })
  nextAvailableSlots: NextAvailableSlotDto[];
}

export class SpecialtyWithStatsDto {
  @ApiProperty({ example: 'specialty-uuid' })
  id: string;

  @ApiProperty({ example: 'Cardiología' })
  name: string;

  @ApiProperty({
    example: 'Especialidad en enfermedades del corazón',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ example: 45, description: 'Total de slots disponibles' })
  availableSlots: number;

  @ApiProperty({ example: 8, description: 'Doctores con disponibilidad' })
  availableDoctors: number;
}

export class AvailabilityStatsDto {
  @ApiProperty({ example: 120 })
  totalAvailableSlots: number;

  @ApiProperty({ example: 25 })
  availableDoctors: number;

  @ApiProperty({
    example: {
      start: '2024-11-15T00:00:00.000Z',
      end: '2024-11-22T00:00:00.000Z',
    },
  })
  dateRange: {
    start: string;
    end: string;
  };
}

export class AvailabilityDashboardDto {
  // Campos para modo dashboard general
  @ApiProperty({ type: [SpecialtyWithStatsDto], required: false })
  specialties?: SpecialtyWithStatsDto[];

  @ApiProperty({ type: [DoctorWithSlotsDto], required: false })
  doctors?: DoctorWithSlotsDto[];

  @ApiProperty({ type: AvailabilityStatsDto, required: false })
  stats?: AvailabilityStatsDto;

  // Campos para modo calendario (cuando hay doctorId)
  @ApiProperty({ type: DoctorWithSlotsDto, required: false })
  doctor?: DoctorWithSlotsDto;

  @ApiProperty({ type: [NextAvailableSlotDto], required: false })
  slots?: NextAvailableSlotDto[];

  @ApiProperty({
    required: false,
    example: {
      start: '2024-11-15T00:00:00.000Z',
      end: '2024-11-22T00:00:00.000Z',
    },
  })
  dateRange?: {
    start: string;
    end: string;
  };
}
