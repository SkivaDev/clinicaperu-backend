// src/appointments/dto/book-appointment.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class BookAppointmentDto {
  @ApiProperty({
    description: 'ID del slot a reservar',
    example: 'clxxx123456789',
  })
  @IsString()
  @IsNotEmpty()
  slotId: string;

  @ApiProperty({
    description: 'Razón o motivo de la cita',
    example: 'Consulta general',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiProperty({
    description: 'Notas adicionales (opcional)',
    example: 'Primera vez en la clínica',
    required: false,
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({
    description: 'Método de pago para la cita',
    enum: PaymentMethod,
    example: 'SIMULATED_CARD',
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;
}
