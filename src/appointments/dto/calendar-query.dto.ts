import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CalendarQueryDto {
  @IsDateString()
  start: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsUUID()
  clinicId?: string;
}
