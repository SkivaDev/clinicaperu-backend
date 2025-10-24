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

@ApiTags('admin/schedules')
@Controller('admin/doctors/:doctorId/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

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

  @Delete(':scheduleId')
  @ApiOperation({
    summary: 'Desactivar un horario (Admin)',
    description: 'Desactiva un horario específico y sus slots futuros libres.',
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
