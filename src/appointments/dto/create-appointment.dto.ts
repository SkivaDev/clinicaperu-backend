import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  doctorId: string;

  @IsUUID()
  slotId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
