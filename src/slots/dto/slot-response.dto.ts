import { SlotStatus } from '@prisma/client';
import { AppointmentResponseDto } from 'src/appointments/dto/appointment-response.dto';
import { ScheduleResponseDto } from 'src/schedules/dto/schedule-response.dto';

export class SlotResponseDto {
  id: string;
  scheduleId: string;
  startAt: Date;
  endAt: Date;
  status: SlotStatus;
  holdExpiresAt: Date | null;
  createdAt: Date;

  appointment?: AppointmentResponseDto;

  // Papas
  schedule?: ScheduleResponseDto;
}
