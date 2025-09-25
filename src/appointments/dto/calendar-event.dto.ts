import { SlotStatus, AppointmentStatus } from '@prisma/client';

export class CalendarEventDto {
  id: string;
  startAt: Date;
  endAt: Date;
  type: 'slot' | 'appointment';
  status: SlotStatus | AppointmentStatus;
  doctorId: string;
  doctorName: string;
  specialtyName: string;
  clinicName: string;
  roomName?: string;
  patientName?: string;
  reason?: string;
  notes?: string;
}

