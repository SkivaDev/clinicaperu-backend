import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

export class DoctorResponseDto {
  // ===========================================================================
  // 🧑‍⚕️ Información principal del doctor
  // ===========================================================================
  @ApiProperty({ description: 'ID único del doctor' })
  id: string;

  @ApiProperty({ description: 'Código CMP del doctor' })
  cmp: number;

  @ApiProperty({ description: 'Estado del doctor (activo/inactivo)' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Años de experiencia' })
  yearsOfExperience?: number | null;

  @ApiPropertyOptional({ description: 'Precio de consulta' })
  consultationPrice?: number | null;

  // ===========================================================================
  // 📊 Métricas del doctor
  // ===========================================================================
  @ApiProperty({
    description: 'Total de citas atendidas por el doctor',
    default: 0,
  })
  attendedAppointments: number;

  @ApiProperty({
    description: 'Total de pacientes atendidos por el doctor',
    default: 0,
  })
  attendedPatients: number;

  @ApiProperty({
    description: 'Calificación promedio del doctor (0-5)',
    default: 0,
  })
  rating: number;

  @ApiProperty({ description: 'Fecha de creación del registro' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización del registro' })
  updatedAt: Date;

  // ===========================================================================
  // 👤 Información del usuario asociado
  // ===========================================================================
  @ApiProperty({
    description: 'Información del usuario relacionado al doctor',
  })
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    dni: string;
    phone?: string | null;
    gender: Gender;
    dayOfBirth: Date;
    profileImage?: string | null;
    isActive: boolean;
  };

  // ===========================================================================
  // 🩺 Información de la especialidad
  // ===========================================================================
  @ApiProperty({
    description: 'Especialidad médica del doctor',
    example: { id: 'uuid', name: 'Cardiología' },
  })
  specialty: {
    id: string;
    name: string;
  };

  // ===========================================================================
  // 🏥 Información de la clínica
  // ===========================================================================
  @ApiProperty({
    description: 'Clínica en la que trabaja el doctor',
    example: { id: 'uuid', name: 'Clínica Peru Salud' },
  })
  clinic: {
    id: string;
    name: string;
  };

  // ===========================================================================
  // 📈 Métricas derivadas (opcionales)
  // ===========================================================================
  @ApiPropertyOptional({
    description: 'Cantidad total de horarios del doctor',
  })
  schedulesCount?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de citas totales del doctor',
  })
  appointmentsCount?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de horarios activos del doctor',
  })
  activeSchedulesCount?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de citas futuras programadas (PENDING o CONFIRMED)',
  })
  upcomingAppointmentsCount?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de slots disponibles (FREE) futuros',
  })
  availableSlotsCount?: number;
}

// ============================================================================
// 🔒 CanDeactivateDoctorResponseDto
// ============================================================================
export class CanDeactivateDoctorResponseDto {
  @ApiProperty({
    description: 'Indica si el doctor puede ser desactivado',
    example: true,
  })
  canDeactivate: boolean;

  @ApiProperty({
    description: 'Razones por las cuales el doctor NO puede desactivarse',
    type: [String],
    example: ['Tiene citas futuras programadas'],
  })
  reasons: string[];

  @ApiProperty({
    description: 'Advertencias sobre la desactivación',
    type: [String],
    example: ['El doctor tiene horarios activos que serán desactivados.'],
  })
  warnings: string[];

  @ApiPropertyOptional({
    description: 'Información adicional sobre métricas del doctor',
    example: {
      upcomingAppointments: 3,
      activeSchedules: 2,
      availableSlots: 10,
    },
  })
  metadata?: {
    upcomingAppointments: number;
    activeSchedules: number;
    availableSlots: number;
  };
}
