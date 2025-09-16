import { IsString } from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  cmp: string;

  @IsString()
  specialtyId: string;

  @IsString()
  clinicId: string;
}
