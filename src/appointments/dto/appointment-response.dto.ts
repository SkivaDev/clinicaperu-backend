import { AppointmentStatus } from '@prisma/client';
import { DoctorResponseDto } from 'src/doctors/dto/doctor-response.dto';
import { SlotResponseDto } from 'src/slots/dto/slot-response.dto';
import { UserResponseDto } from 'src/users/dto/user-response.dto';

export class AppointmentResponseDto {
  id: string;
  status: AppointmentStatus; // PENDING, CONFIRMED, ATTENDED, CANCELLED, NO_SHOW
  reason: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  attendedAt: Date | null;

  // Papas
  slot?: SlotResponseDto;
  doctor?: DoctorResponseDto;
  user?: UserResponseDto;
}
