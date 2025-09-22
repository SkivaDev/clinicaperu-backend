import { ClinicResponseDto } from 'src/clinics/dto/clinic-response.dto';

export class RoomResponseDto {
  id: string;
  name: string;
  floor: string | null;
  clinic: ClinicResponseDto;

  constructor(partial: Partial<RoomResponseDto>) {
    Object.assign(this, partial);
  }
}
