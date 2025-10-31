// src/calendar/dto/calendar-event.dto.ts
import { SlotStatus, AppointmentStatus } from '@prisma/client';

export type EventType = 'slot' | 'appointment';

export class DoctorInfoDto {
  id: string;
  cmp: number;
  user: {
    firstName: string;
    lastName: string;
  };
}

export class SpecialtyInfoDto {
  id: string;
  name: string;
}

export class PatientInfoDto {
  id: string;
  firstName: string;
  lastName: string;
  // dni: string;
}

export class ClinicInfoDto {
  id: string;
  name: string;
}

export class CalendarEventDto {
  id: string;
  type: EventType;
  startAt: string; // ISO 8601 format
  endAt: string; // ISO 8601 format
  status: SlotStatus | AppointmentStatus;
  doctor?: DoctorInfoDto;
  specialty?: SpecialtyInfoDto;
  clinic?: ClinicInfoDto;
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
