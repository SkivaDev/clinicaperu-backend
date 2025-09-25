import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  cmp: string;

  @IsBoolean()
  @IsOptional()
  isActive: boolean;

  @IsString()
  @IsOptional()
  yearsOfExperience: number;

  @IsString()
  @IsOptional()
  consultationPrice: number;

  @IsString()
  specialtyId: string;

  @IsString()
  clinicId: string;
}
