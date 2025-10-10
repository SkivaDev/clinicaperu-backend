import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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

  @Get('all')
  async getAllDoctorSchedules(
    @Param('doctorId') doctorId: string,
  ): Promise<ResponseDto<ScheduleResponseDto[]>> {
    const schedules =
      await this.schedulesService.getAllDoctorSchedules(doctorId);
    return {
      statusCode: HttpStatus.OK,
      message: 'All schedules retrieved successfully (including inactive)',
      data: schedules,
    };
  }

  @Get('inactive')
  async getInactiveDoctorSchedules(
    @Param('doctorId') doctorId: string,
  ): Promise<ResponseDto<ScheduleResponseDto[]>> {
    const schedules =
      await this.schedulesService.getInactiveDoctorSchedules(doctorId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Inactive schedules retrieved successfully',
      data: schedules,
    };
  }

  @Delete(':scheduleId')
  async deactivateSchedule(
    @Param('doctorId') doctorId: string,
    @Param('scheduleId') scheduleId: string,
  ): Promise<
    ResponseDto<{
      scheduleDeactivated: boolean;
      slotsDeactivated: number;
      slotsPreserved: number;
      errors: string[];
    }>
  > {
    const result = await this.schedulesService.deactivateSchedule(
      doctorId,
      scheduleId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Schedule deactivated successfully',
      data: result,
    };
  }

  @Post(':scheduleId/reactivate')
  async reactivateSchedule(
    @Param('doctorId') doctorId: string,
    @Param('scheduleId') scheduleId: string,
  ): Promise<
    ResponseDto<{
      scheduleReactivated: boolean;
      slotsReactivated: number;
      slotsGenerated: number;
      errors: string[];
    }>
  > {
    const result = await this.schedulesService.reactivateSchedule(
      doctorId,
      scheduleId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Schedule reactivated successfully',
      data: result,
    };
  }
}
