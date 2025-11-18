import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ScheduleResponseDto } from './dto/schedule-response.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { UpdateSchedulesDto } from './dto/update-schedule.dto';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { getScheduleConfig } from './schedule.config';

@ApiTags('admin/schedules')
@Controller('admin/doctors/:doctorId/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('config')
  @ApiOperation({
    summary: 'Obtener configuración de slots (Admin)',
    description:
      'Obtiene la configuración de generación de slots: horizonte, duraciones disponibles, límites.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuración obtenida exitosamente',
  })
  getScheduleConfig(): ResponseDto<{
    slotGenerationWeeks: number;
    slotGenerationDays: number;
    maxSlotGenerationWeeks: number;
    minSlotGenerationWeeks: number;
    defaultSlotDurations: number[];
    maxSchedulesPerDay: number;
    clinicOpenTime: string;
    clinicCloseTime: string;
    clinicWorkingDays: number[];
  }> {
    const config = getScheduleConfig();
    return {
      statusCode: HttpStatus.OK,
      message: 'Schedule configuration retrieved successfully',
      data: {
        slotGenerationWeeks: config.SLOT_GENERATION_WEEKS,
        slotGenerationDays: config.SLOT_GENERATION_WEEKS * 7,
        maxSlotGenerationWeeks: config.MAX_SLOT_GENERATION_WEEKS,
        minSlotGenerationWeeks: config.MIN_SLOT_GENERATION_WEEKS,
        defaultSlotDurations: [...config.DEFAULT_SLOT_DURATIONS],
        maxSchedulesPerDay: config.MAX_SCHEDULES_PER_DAY,
        clinicOpenTime: config.CLINIC_OPEN_TIME,
        clinicCloseTime: config.CLINIC_CLOSE_TIME,
        clinicWorkingDays: [...config.CLINIC_WORKING_DAYS],
      },
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener horarios de un doctor (Admin)',
    description:
      'Obtiene todos los horarios activos de un doctor. Solo para administradores.',
  })
  @ApiParam({ name: 'doctorId', description: 'ID del doctor', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horarios obtenidos exitosamente',
    type: [ScheduleResponseDto],
  })
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
  @ApiOperation({
    summary: 'Actualizar horarios de un doctor (Admin)',
    description:
      'Actualiza todos los horarios de un doctor. Desactiva los anteriores y crea nuevos.',
  })
  @ApiParam({ name: 'doctorId', description: 'ID del doctor', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horarios actualizados exitosamente',
    type: [ScheduleResponseDto],
  })
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
  @ApiOperation({
    summary: 'Regenerar slots de un doctor (Admin)',
    description:
      'Regenera todos los slots para los horarios activos de un doctor.',
  })
  @ApiParam({ name: 'doctorId', description: 'ID del doctor', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Slots regenerados exitosamente',
  })
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
  @ApiOperation({
    summary: 'Obtener estadísticas de horarios (Admin)',
    description: 'Obtiene estadísticas de horarios y slots de un doctor.',
  })
  @ApiParam({ name: 'doctorId', description: 'ID del doctor', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas obtenidas exitosamente',
  })
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
  @ApiOperation({
    summary: 'Obtener todos los horarios (Admin)',
    description:
      'Obtiene todos los horarios de un doctor, incluyendo inactivos.',
  })
  @ApiParam({ name: 'doctorId', description: 'ID del doctor', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Todos los horarios obtenidos',
    type: [ScheduleResponseDto],
  })
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
  @ApiOperation({
    summary: 'Obtener horarios inactivos (Admin)',
    description: 'Obtiene solo los horarios inactivos de un doctor.',
  })
  @ApiParam({ name: 'doctorId', description: 'ID del doctor', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horarios inactivos obtenidos',
    type: [ScheduleResponseDto],
  })
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

  @Get(':scheduleId/deactivation-preview')
  @ApiOperation({
    summary: 'Preview de desactivación de horario (Admin)',
    description:
      'Obtiene información sobre el impacto de desactivar un horario sin realizar la acción.',
  })
  @ApiParam({ name: 'doctorId', description: 'ID del doctor', type: String })
  @ApiParam({ name: 'scheduleId', description: 'ID del horario', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preview obtenido exitosamente',
  })
  async getDeactivationPreview(
    @Param('doctorId') doctorId: string,
    @Param('scheduleId') scheduleId: string,
  ): Promise<
    ResponseDto<{
      canDeactivate: boolean;
      blockedReason: string | null;
      futureFreeSlotsCount: number;
      futureBookedSlotsCount: number;
      bookedSlotsWithin24h: number;
      bookedSlotsAfter24h: number;
      earliestBookedSlot: Date | null;
      warnings: string[];
    }>
  > {
    const result = await this.schedulesService.getDeactivationPreview(
      doctorId,
      scheduleId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Deactivation preview retrieved successfully',
      data: result,
    };
  }

  @Delete(':scheduleId')
  @ApiOperation({
    summary: 'Desactivar un horario (Admin)',
    description:
      'Desactiva un horario específico y sus slots futuros libres. Esta es una eliminación lógica. ' +
      'Si force=true, se saltará la validación de citas en las próximas 24h.',
  })
  @ApiParam({ name: 'doctorId', description: 'ID del doctor', type: String })
  @ApiParam({ name: 'scheduleId', description: 'ID del horario', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horario desactivado exitosamente',
  })
  async deactivateSchedule(
    @Param('doctorId') doctorId: string,
    @Param('scheduleId') scheduleId: string,
    @Query('force') force?: string,
  ): Promise<
    ResponseDto<{
      scheduleDeactivated: boolean;
      slotsDeactivated: number;
      slotsPreserved: number;
      futureBookedCount: number;
      bookedSlotsWithin24h: number;
      bookedSlotsAfter24h: number;
      errors: string[];
      warnings: string[];
    }>
  > {
    const result = await this.schedulesService.deactivateSchedule(
      doctorId,
      scheduleId,
      force === 'true',
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Schedule deactivated successfully',
      data: result,
    };
  }

  @Post(':scheduleId/reactivate')
  @ApiOperation({
    summary: 'Reactivar un horario (Admin)',
    description: 'Reactiva un horario inactivo y regenera sus slots.',
  })
  @ApiParam({ name: 'doctorId', description: 'ID del doctor', type: String })
  @ApiParam({ name: 'scheduleId', description: 'ID del horario', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horario reactivado exitosamente',
  })
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
