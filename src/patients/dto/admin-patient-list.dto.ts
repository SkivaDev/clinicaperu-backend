import { ApiProperty } from '@nestjs/swagger';
import { Role, Gender } from '@prisma/client';

/**
 * DTO para estadísticas del paciente
 */
export class PatientStatisticsDto {
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
    description: 'Fecha de la última cita',
    example: '2025-01-15T10:00:00.000Z',
    nullable: true,
  })
  lastAppointmentDate: Date | null;
}

/**
 * DTO para la lista de pacientes en el panel de administración
 */
export class AdminPatientListDto {
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
    description: 'Nombre completo del paciente',
    example: 'Juan Pérez García',
  })
  fullName: string;

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
    description: 'Estadísticas del paciente',
    type: PatientStatisticsDto,
  })
  statistics: PatientStatisticsDto;
}
