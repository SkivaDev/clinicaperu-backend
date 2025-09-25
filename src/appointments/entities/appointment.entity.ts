import { AppointmentStatus } from '@prisma/client';

export class AppointmentEntity {
  id: string;
  userId: string;
  doctorId: string;
  slotId: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  attendedAt?: Date;
}
