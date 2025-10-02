// src/calendar/dto/calendar-response.dto.ts
import { SlotStatus, AppointmentStatus } from '@prisma/client';

export class AppointmentInfoDto {
  id: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string;
  };
}

export class CalendarSlotDto {
  id: string;
  startAt: Date;
  endAt: Date;
  status: SlotStatus;
  holdExpiresAt?: Date;

  // Información del doctor
  doctor: {
    id: string;
    cmp: number;
    user: {
      firstName: string;
      lastName: string;
    };
    specialty: {
      name: string;
    };
  };

  // Información de la clínica
  clinic: {
    id: string;
    name: string;
  };

  // Información de la cita si está reservada
  appointment?: AppointmentInfoDto;
}

export class CalendarResponseDto {
  dateRange: {
    start: Date;
    end: Date;
  };
  slots: CalendarSlotDto[];
  summary: {
    totalSlots: number;
    available: number;
    booked: number;
    held: number;
    blocked: number;
  };
}
