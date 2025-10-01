import {
  Controller,
  Get,
  // Post,
  Body,
  Patch,
  Param,
  // Delete,
  HttpStatus,
} from '@nestjs/common';
// import { CreateScheduleDto } from './dto/create-schedule.dto';
// import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { UpdateSchedulesDto } from './dto/update-schedule.dto';
import { SchedulesService } from './schedules.service';

@Controller('admin/doctors/:doctorId/schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  async getDoctorSchedules(
    @Param('doctorId') doctorId: string,
  ): Promise<ResponseDto<ScheduleResponseDto[]>> {
    const schedules = await this.schedulesService.getDoctorSchedules(doctorId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Schedules found successfully',
      data: schedules,
    };
  }

  @Patch()
  async updateSchedule(
    @Param('doctorId') doctorId: string,
    @Body() dto: UpdateSchedulesDto,
  ): Promise<ResponseDto<ScheduleResponseDto[]>> {
    const updatedSchedules = await this.schedulesService.updateSchedules(
      doctorId,
      dto.schedules,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Schedules updated successfully',
      data: updatedSchedules,
    };
  }
}
