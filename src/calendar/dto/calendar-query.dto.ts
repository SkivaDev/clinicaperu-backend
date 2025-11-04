// src/calendar/dto/calendar-query.dto.ts
import {
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SlotStatus, AppointmentStatus } from '@prisma/client';
import { CalendarView } from './get-calendar-query.dto';

export class CalendarQueryDto {
  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsDateString()
  start: string;

  @IsDateString()
  @IsOptional()
  end?: string;

  @IsEnum(CalendarView)
  @IsOptional()
  view?: CalendarView;

  @IsOptional()
  @IsEnum(SlotStatus)
  status?: SlotStatus;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  appointmentStatus?: AppointmentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 500;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
