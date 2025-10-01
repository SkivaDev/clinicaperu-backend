import {
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateScheduleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  startTime: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  endTime: string;

  @IsInt()
  @IsIn([15, 20, 30, 45, 60])
  slotMinutes: number;

  @IsDate()
  @IsOptional()
  effectiveFrom?: Date;

  @IsDate()
  @IsOptional()
  effectiveTo?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
