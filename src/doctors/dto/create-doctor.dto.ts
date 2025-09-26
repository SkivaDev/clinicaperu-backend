import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateDoctorDto {
  @IsInt()
  cmp: number;

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
