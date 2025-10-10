import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { SlotsService, SlotAvailabilityFilter } from './slots.service';
import { ResponseDto } from 'src/common/dto/response.dto';

@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Get()
  async getAvailableSlots(
    @Query('doctorId') doctorId?: string,
    @Query('scheduleId') scheduleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('isActive') isActive?: string,
  ): Promise<ResponseDto<any[]>> {
    const filters: SlotAvailabilityFilter = {};

    if (doctorId) filters.doctorId = doctorId;
    if (scheduleId) filters.scheduleId = scheduleId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (status) filters.status = status as any;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const slots = await this.slotsService.getAvailableSlots(filters);
    return {
      statusCode: HttpStatus.OK,
      message: 'Available slots retrieved successfully',
      data: slots,
    };
  }

  @Get('doctor/:doctorId')
  async getDoctorSlots(
    @Param('doctorId') doctorId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('isActive') isActive?: string,
  ): Promise<ResponseDto<any[]>> {
    const filters: Omit<SlotAvailabilityFilter, 'doctorId'> = {};

    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (status) filters.status = status as any;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const slots = await this.slotsService.getDoctorSlots(doctorId, filters);
    return {
      statusCode: HttpStatus.OK,
      message: 'Doctor slots retrieved successfully',
      data: slots,
    };
  }

  @Get('schedule/:scheduleId')
  async getScheduleSlots(
    @Param('scheduleId') scheduleId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('isActive') isActive?: string,
  ): Promise<ResponseDto<any[]>> {
    const filters: Omit<SlotAvailabilityFilter, 'scheduleId'> = {};

    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (status) filters.status = status as any;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const slots = await this.slotsService.getScheduleSlots(scheduleId, filters);
    return {
      statusCode: HttpStatus.OK,
      message: 'Schedule slots retrieved successfully',
      data: slots,
    };
  }

  @Get('statistics/doctor/:doctorId')
  async getSlotStatistics(
    @Param('doctorId') doctorId: string,
  ): Promise<ResponseDto<{
    totalSlots: number;
    activeSlots: number;
    inactiveSlots: number;
    freeSlots: number;
    bookedSlots: number;
    heldSlots: number;
    blockedSlots: number;
    futureSlots: number;
    pastSlots: number;
  }>> {
    const statistics = await this.slotsService.getSlotStatistics(doctorId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Slot statistics retrieved successfully',
      data: statistics,
    };
  }

  @Get(':slotId/check-availability')
  async checkSlotAvailability(
    @Param('slotId') slotId: string,
  ): Promise<ResponseDto<{ canBook: boolean; reason?: string }>> {
    const canBook = await this.slotsService.canBookSlot(slotId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Slot availability checked successfully',
      data: {
        canBook,
        reason: canBook ? undefined : 'Slot is not available for booking',
      },
    };
  }

  @Get(':slotId')
  async getSlotById(
    @Param('slotId') slotId: string,
  ): Promise<ResponseDto<any>> {
    const slot = await this.slotsService.getSlotById(slotId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Slot retrieved successfully',
      data: slot,
    };
  }
}