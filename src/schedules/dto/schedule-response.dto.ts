import { DoctorResponseDto } from 'src/doctors/dto/doctor-response.dto';

export class ScheduleResponseDto {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // slots?: SlotResponseDto[];

  doctor?: DoctorResponseDto;
}
