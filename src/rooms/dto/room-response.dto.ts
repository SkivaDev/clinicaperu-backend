import { RoomType } from '@prisma/client';
import { ClinicResponseDto } from 'src/clinics/dto/clinic-response.dto';

export class RoomResponseDto {
  id: string;
  name: string;
  roomNumber: string;
  roomType: RoomType;
  floor: number;
  capacity: number;
  equipment: string[];
  createdAt: Date;
  updatedAt: Date;

  clinic?: ClinicResponseDto;
}
