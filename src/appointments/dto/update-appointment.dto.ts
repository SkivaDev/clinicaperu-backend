import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  confirmedAt?: Date;

  @IsOptional()
  @IsDateString()
  cancelledAt?: Date;

  @IsOptional()
  @IsDateString()
  attendedAt?: Date;
}
