import { ClinicResponseDto } from 'src/clinics/dto/clinic-response.dto';
import { ScheduleResponseDto } from 'src/schedules/dto/schedule-response.dto';
import { SpecialtyResponseDto } from 'src/specialties/dto/specialty-response.dto';
import { UserResponseDto } from 'src/users/dto/user-response.dto';

export class DoctorResponseDto {
  id: string;
  cmp: number;

  isActive: boolean;
  yearsOfExperience?: number | null;
  consultationPrice?: number | null;
  attendedAppointments: number;
  attendedPatients: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;

  schedules?: ScheduleResponseDto[];
  // unavail?: DoctorUnavailabilityResponseDto[];
  // appointments?: AppointmentResponseDto[];

  user?: UserResponseDto;
  specialty?: SpecialtyResponseDto;
  clinic?: ClinicResponseDto;
}
