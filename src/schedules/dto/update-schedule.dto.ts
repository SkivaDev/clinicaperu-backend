// import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduleDto } from './create-schedule.dto';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}

export class UpdateSchedulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScheduleDto)
  schedules: CreateScheduleDto[];
}
