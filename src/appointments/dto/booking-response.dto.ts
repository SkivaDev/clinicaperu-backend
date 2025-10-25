// src/appointments/dto/booking-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';

export class BookingResponseDto {
  @ApiProperty({
    description: 'ID de la cita creada',
    example: 'clxxx123456789',
  })
  id: string;

  @ApiProperty({
    description: 'ID del slot reservado',
    example: 'clxxx987654321',
  })
  slotId: string;

  @ApiProperty({
    description: 'ID del paciente',
    example: 'clxxx111222333',
  })
  userId: string;

  @ApiProperty({
    description: 'ID del doctor',
    example: 'clxxx444555666',
  })
  doctorId: string;

  @ApiProperty({
    description: 'Fecha y hora de inicio de la cita',
    example: '2025-10-15T09:00:00.000Z',
  })
  startAt: Date;

  @ApiProperty({
    description: 'Fecha y hora de fin de la cita',
    example: '2025-10-15T09:30:00.000Z',
  })
  endAt: Date;

  @ApiProperty({
    description: 'Estado de la cita',
    enum: AppointmentStatus,
    example: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  @ApiProperty({
    description: 'Razón de la cita',
    example: 'Consulta general',
  })
  reason: string;

  @ApiProperty({
    description: 'Notas adicionales',
    example: 'Primera vez en la clínica',
    required: false,
  })
  notes?: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2025-10-10T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Información del doctor',
  })
  doctor: {
    id: string;
    name: string;
    specialty: string;
  };

  @ApiProperty({
    description: 'Información de la clínica',
  })
  clinic: {
    id: string;
    name: string;
  };
}
