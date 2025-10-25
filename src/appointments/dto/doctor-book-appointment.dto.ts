// src/appointments/dto/doctor-book-appointment.dto.ts
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DoctorBookAppointmentDto {
  @ApiProperty({
    description: 'ID del slot a reservar',
    example: 'clxxx123456789',
  })
  @IsString()
  @IsNotEmpty()
  slotId: string;

  @ApiProperty({
    description: 'ID del paciente para quien se reserva',
    example: 'clxxx987654321',
  })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({
    description: 'Razón o motivo de la cita',
    example: 'Cita de seguimiento post-operatorio',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiProperty({
    description: 'Notas adicionales (opcional)',
    example: 'Revisar resultados de laboratorio',
    required: false,
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
