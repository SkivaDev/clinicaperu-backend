import { ApiProperty } from '@nestjs/swagger';
import { Gender, Role } from '@prisma/client';

/**
 * HU-028: DTO de respuesta para perfil de paciente
 */
export class PatientProfileDto {
  @ApiProperty({ example: 'uuid-here' })
  id: string;

  @ApiProperty({ example: 'Juan' })
  firstName: string;

  @ApiProperty({ example: 'Pérez García' })
  lastName: string;

  @ApiProperty({ example: '12345678' })
  dni: string;

  @ApiProperty({ example: 'juan.perez@example.com' })
  email: string;

  @ApiProperty({ example: '+51987654321', nullable: true })
  phone: string | null;

  @ApiProperty({ example: '1990-01-15T00:00:00.000Z' })
  dayOfBirth: Date;

  @ApiProperty({ enum: Gender, example: Gender.MALE })
  gender: Gender;

  @ApiProperty({
    example: 'https://s3.amazonaws.com/bucket/profile-images/...',
    nullable: true,
    description: 'URL prefirmada temporal (válida por 5 minutos)',
  })
  profileImage: string | null;

  @ApiProperty({ enum: Role, example: Role.PATIENT })
  role: Role;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  updatedAt: Date;
}

/**
 * HU-028: DTO de respuesta para perfil de doctor
 * Incluye datos adicionales profesionales
 */
export class DoctorProfileDto extends PatientProfileDto {
  @ApiProperty({
    description: 'Datos profesionales del doctor',
    example: {
      id: 'doctor-uuid',
      cmp: 12345,
      specialty: 'Cardiología',
      clinic: 'Clínica San Pablo',
      yearsOfExperience: 10,
      consultationPrice: 150.0,
      rating: 4.5,
    },
  })
  doctorInfo: {
    id: string;
    cmp: number;
    specialty: string;
    clinic: string;
    yearsOfExperience: number | null;
    consultationPrice: number | null;
    rating: number;
  };
}
