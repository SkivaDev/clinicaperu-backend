import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para estadísticas del doctor con el paciente
 */
export class DoctorStatisticsDto {
  @ApiProperty({
    description: 'Total de citas con este paciente',
    example: 5,
  })
  totalAppointments: number;

  @ApiProperty({
    description: 'Citas atendidas con este paciente',
    example: 4,
  })
  attendedAppointments: number;

  @ApiProperty({
    description: 'Fecha de la última cita',
    example: '2025-01-15T10:00:00.000Z',
  })
  lastAppointmentDate: Date;
}

/**
 * HU-027: DTO de respuesta para el endpoint GET /patients/my-doctors
 * Contiene información del doctor y estadísticas con el paciente
 */
export class MyDoctorDto {
  @ApiProperty({
    description: 'ID único del doctor',
    example: 'uuid-here',
  })
  doctorId: string;

  @ApiProperty({
    description: 'Nombre del doctor',
    example: 'Juan',
  })
  firstName: string;

  @ApiProperty({
    description: 'Apellido del doctor',
    example: 'Pérez García',
  })
  lastName: string;

  @ApiProperty({
    description: 'Nombre completo del doctor',
    example: 'Juan Pérez García',
  })
  fullName: string;

  @ApiProperty({
    description: 'URL de la foto de perfil',
    example: 'https://example.com/profile.jpg',
    nullable: true,
  })
  profileImage: string | null;

  @ApiProperty({
    description: 'Código de Colegiatura Médica del Perú',
    example: 12345,
  })
  cmp: number;

  @ApiProperty({
    description: 'Rating promedio del doctor',
    example: 4.5,
    minimum: 0,
    maximum: 5,
  })
  rating: number;

  @ApiProperty({
    description: 'Años de experiencia del doctor',
    example: 10,
    nullable: true,
  })
  yearsOfExperience: number | null;

  @ApiProperty({
    description: 'Precio de consulta en soles',
    example: 150.0,
    nullable: true,
  })
  consultationPrice: number | null;

  @ApiProperty({
    description: 'Nombre de la especialidad',
    example: 'Cardiología',
  })
  specialty: string;

  @ApiProperty({
    description: 'Nombre de la clínica',
    example: 'Clínica San Pablo',
  })
  clinic: string;

  @ApiProperty({
    description: 'Estadísticas del doctor con este paciente',
    type: DoctorStatisticsDto,
  })
  statistics: DoctorStatisticsDto;
}
