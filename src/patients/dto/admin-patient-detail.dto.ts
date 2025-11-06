import { ApiProperty } from '@nestjs/swagger';
import { Role, Gender, AppointmentStatus } from '@prisma/client';

/**
 * DTO para estadísticas detalladas del paciente
 */
export class PatientDetailStatisticsDto {
  @ApiProperty({
    description: 'Total de citas',
    example: 10,
  })
  totalAppointments: number;

  @ApiProperty({
    description: 'Citas confirmadas',
    example: 5,
  })
  confirmedAppointments: number;

  @ApiProperty({
    description: 'Citas atendidas',
    example: 4,
  })
  attendedAppointments: number;

  @ApiProperty({
    description: 'Citas canceladas',
    example: 1,
  })
  cancelledAppointments: number;

  @ApiProperty({
    description: 'Citas pendientes',
    example: 2,
  })
  pendingAppointments: number;

  @ApiProperty({
    description: 'Citas con no show',
    example: 0,
  })
  noShowAppointments: number;
}

/**
 * DTO para información de cita en el detalle del paciente
 */
export class PatientAppointmentDto {
  @ApiProperty({
    description: 'ID de la cita',
    example: 'uuid-here',
  })
  id: string;

  @ApiProperty({
    description: 'Estado de la cita',
    enum: AppointmentStatus,
    example: AppointmentStatus.CONFIRMED,
  })
  status: AppointmentStatus;

  @ApiProperty({
    description: 'Fecha y hora de inicio de la cita',
    example: '2025-01-20T10:00:00.000Z',
  })
  startAt: Date;

  @ApiProperty({
    description: 'Fecha y hora de fin de la cita',
    example: '2025-01-20T10:30:00.000Z',
  })
  endAt: Date;

  @ApiProperty({
    description: 'Motivo de la cita',
    example: 'Consulta general',
    nullable: true,
  })
  reason: string | null;

  @ApiProperty({
    description: 'Nombre del doctor',
    example: 'Dr. Juan Pérez',
  })
  doctorName: string;

  @ApiProperty({
    description: 'Especialidad del doctor',
    example: 'Cardiología',
  })
  specialty: string;

  @ApiProperty({
    description: 'Clínica',
    example: 'Clínica San Pablo',
  })
  clinic: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2025-01-10T08:00:00.000Z',
  })
  createdAt: Date;
}

/**
 * DTO para el detalle completo de un paciente en el panel de administración
 */
export class AdminPatientDetailDto {
  @ApiProperty({
    description: 'ID único del usuario',
    example: 'uuid-here',
  })
  id: string;

  @ApiProperty({
    description: 'DNI del paciente',
    example: '12345678',
  })
  dni: string;

  @ApiProperty({
    description: 'Nombre del paciente',
    example: 'Juan',
  })
  firstName: string;

  @ApiProperty({
    description: 'Apellido del paciente',
    example: 'Pérez García',
  })
  lastName: string;

  @ApiProperty({
    description: 'Email del paciente',
    example: 'juan.perez@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Teléfono del paciente',
    example: '+51987654321',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    description: 'Género del paciente',
    enum: Gender,
    example: Gender.MALE,
  })
  gender: Gender;

  @ApiProperty({
    description: 'Fecha de nacimiento',
    example: '1990-05-15T00:00:00.000Z',
  })
  dayOfBirth: Date;

  @ApiProperty({
    description: 'Edad del paciente',
    example: 34,
  })
  age: number;

  @ApiProperty({
    description: 'URL de la foto de perfil',
    example: 'https://example.com/profile.jpg',
    nullable: true,
  })
  profileImage: string | null;

  @ApiProperty({
    description: 'Rol del usuario',
    enum: Role,
    example: Role.PATIENT,
  })
  role: Role;

  @ApiProperty({
    description: 'Estado activo del paciente',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Fecha de registro',
    example: '2024-01-15T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2024-01-20T15:30:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Estadísticas del paciente',
    type: PatientDetailStatisticsDto,
  })
  statistics: PatientDetailStatisticsDto;

  @ApiProperty({
    description: 'Lista de citas del paciente',
    type: [PatientAppointmentDto],
  })
  appointments: PatientAppointmentDto[];
}
