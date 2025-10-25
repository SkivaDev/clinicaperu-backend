// src/calendar/dto/calendar-event.dto.ts
import { SlotStatus, AppointmentStatus } from '@prisma/client';

export type EventType = 'slot' | 'appointment';

export class DoctorInfoDto {
  id: string;
  name: string;
}

export class PatientInfoDto {
  id: string;
  name: string;
}

export class CalendarEventDto {
  id: string;
  type: EventType;
  start: string; // ISO 8601 format
  end: string; // ISO 8601 format
  status: SlotStatus | AppointmentStatus;
  doctor?: DoctorInfoDto;
  patient?: PatientInfoDto;
}

export class CalendarMetaDto {
  totalSlots: number;
  bookedSlots: number;
}

export class CalendarEventsResponseDto {
  events: CalendarEventDto[];
  meta: CalendarMetaDto;
}
