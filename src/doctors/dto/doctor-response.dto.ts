import { ClinicResponseDto } from 'src/clinics/dto/clinic-response.dto';
import { SpecialtyResponseDto } from 'src/specialties/dto/specialty-response.dto';
import { UserResponseDto } from 'src/users/dto/user-response.dto';

export class DoctorResponseDto {
  id: string;
  cmp: string;
  user?: UserResponseDto;
  specialty?: SpecialtyResponseDto;
  clinic?: ClinicResponseDto;
}
