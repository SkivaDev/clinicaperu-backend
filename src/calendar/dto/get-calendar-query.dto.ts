// src/calendar/dto/get-calendar-query.dto.ts
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export enum CalendarView {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum CalendarScope {
  DOCTOR = 'doctor',
  PATIENT = 'patient',
}

export class GetCalendarQueryDto {
  @IsDateString()
  start: string;

  @IsEnum(CalendarView)
  view: CalendarView;

  @IsEnum(CalendarScope)
  @IsOptional()
  scope?: CalendarScope;

  @IsString()
  @IsOptional()
  doctorId?: string;

  @IsString()
  @IsOptional()
  clinicId?: string;

  @Transform(({ value }) => value === 'true')
  @IsOptional()
  includeUnavailable?: boolean;
}
