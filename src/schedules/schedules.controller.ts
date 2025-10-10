import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  HttpStatus,
} from '@nestjs/common';
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

  @Post('regenerate-slots')
  async regenerateSlots(@Param('doctorId') doctorId: string): Promise<
    ResponseDto<{
      schedulesProcessed: number;
      slotsGenerated: number;
      errors: string[];
    }>
  > {
    const result =
      await this.schedulesService.regenerateSlotsForDoctor(doctorId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Slots regenerated successfully',
      data: result,
    };
  }

  @Get('statistics')
  async getScheduleStatistics(@Param('doctorId') doctorId: string): Promise<
    ResponseDto<{
      totalSchedules: number;
      activeSchedules: number;
      inactiveSchedules: number;
      totalSlots: number;
      freeSlots: number;
      bookedSlots: number;
      heldSlots: number;
      blockedSlots: number;
    }>
  > {
    const statistics =
      await this.schedulesService.getScheduleStatistics(doctorId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Schedule statistics retrieved successfully',
      data: statistics,
    };
  }
}
