import {
  Controller,
  Get,
  Post,
  Body,
  Put,
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
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';
import { ResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { Role } from '@prisma/client';
import type { CurrentUserPayload } from '../auth/types/current-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

/**
 * Controlador para que los doctores gestionen su propia agenda
 * Ruta base: /doctor/schedules
 * Seguridad: Solo doctores autenticados
 * Identificación: Usa userId del JWT para obtener doctorId automáticamente
 */
@ApiTags('Doctor - Gestión de Agenda')
@Controller('doctor/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
@ApiBearerAuth()
export class DoctorSchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper: Obtiene el doctorId a partir del userId del token JWT
   */
  private async getDoctorIdFromUser(userId: string): Promise<string> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException(
        'No se encontró un perfil de doctor asociado a este usuario',
      );
    }

    return doctor.id;
  }

  /**
   * POST /doctor/schedules - Crear un nuevo horario para el doctor autenticado
   * El doctorId se obtiene automáticamente del token JWT
   */
  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo horario en tu agenda',
    description:
      'Crea un horario recurrente en tu agenda. El sistema identifica automáticamente tu perfil de doctor.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Horario creado exitosamente',
    type: ScheduleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos inválidos o horarios solapados',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'El horario se solapa con uno existente',
  })
  async create(
    @Body() createScheduleDto: Omit<CreateScheduleDto, 'doctorId'>,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<ScheduleResponseDto>> {
    // Obtener doctorId del usuario autenticado
    const doctorId = await this.getDoctorIdFromUser(user.userId);

    // Crear el horario con el doctorId obtenido
    const schedule = await this.schedulesService.create({
      ...createScheduleDto,
      doctorId,
    });

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Horario creado exitosamente',
      data: schedule,
    };
  }

  /**
   * GET /doctor/schedules - Obtener todos los horarios del doctor autenticado
   */
  @Get()
  @ApiOperation({
    summary: 'Obtener todos tus horarios',
    description:
      'Obtiene todos los horarios activos de tu agenda con sus slots generados.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horarios obtenidos exitosamente',
    type: [ScheduleResponseDto],
  })
  async getMySchedules(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<ScheduleResponseDto[]>> {
    const doctorId = await this.getDoctorIdFromUser(user.userId);
    const schedules = await this.schedulesService.getDoctorSchedules(doctorId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Horarios obtenidos exitosamente',
      data: schedules,
    };
  }

  /**
   * GET /doctor/schedules/:id - Obtener un horario específico del doctor
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un horario específico de tu agenda',
    description: 'Obtiene los detalles de un horario específico con sus slots.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del horario (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horario encontrado',
    type: ScheduleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Horario no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Este horario no pertenece a tu agenda',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<ScheduleResponseDto>> {
    const doctorId = await this.getDoctorIdFromUser(user.userId);
    const schedule = await this.schedulesService.findOne(id);

    // Verificar que el horario pertenece al doctor autenticado
    const scheduleData = await this.prisma.schedule.findUnique({
      where: { id },
      select: { doctorId: true },
    });

    if (scheduleData?.doctorId !== doctorId) {
      throw new NotFoundException('Este horario no pertenece a tu agenda');
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Horario encontrado',
      data: schedule,
    };
  }

  /**
   * PUT /doctor/schedules/:id - Editar un horario del doctor (flujo seguro)
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Editar un horario de tu agenda (flujo seguro)',
    description:
      'Edita un horario creando uno nuevo y desactivando el anterior. ' +
      'Esto preserva las citas ya reservadas. Bloqueado si hay citas en las próximas 24h.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del horario (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horario editado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Horario no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Hay citas reservadas en las próximas 24 horas',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Este horario no pertenece a tu agenda',
  })
  async update(
    @Param('id') id: string,
    @Body() newScheduleData: Omit<CreateScheduleDto, 'doctorId'>,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<
    ResponseDto<{
      oldScheduleDeactivated: boolean;
      newScheduleCreated: boolean;
      oldSchedule: {
        id: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      };
      newSchedule: any;
      slotsDeactivated: number;
      slotsGenerated: number;
      futureBookedCount: number;
      bookedSlotsWithin24h: number;
      bookedSlotsAfter24h: number;
      warnings: string[];
      errors: string[];
    }>
  > {
    const doctorId = await this.getDoctorIdFromUser(user.userId);

    const result = await this.schedulesService.changeScheduleForDoctor(
      doctorId,
      id,
      newScheduleData,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Horario editado exitosamente',
      data: result,
    };
  }

  /**
   * GET /doctor/schedules/:id/deactivation-preview - Preview de desactivación
   */
  @Get(':id/deactivation-preview')
  @ApiOperation({
    summary: 'Ver preview de desactivación de horario',
    description:
      'Obtiene información sobre el impacto de desactivar un horario sin realizar la acción.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del horario (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preview obtenido exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Horario no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Este horario no pertenece a tu agenda',
  })
  async getDeactivationPreview(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
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
    const doctorId = await this.getDoctorIdFromUser(user.userId);

    // Verificar que el horario pertenece al doctor autenticado
    const scheduleData = await this.prisma.schedule.findUnique({
      where: { id },
      select: { doctorId: true },
    });

    if (!scheduleData) {
      throw new NotFoundException('Horario no encontrado');
    }

    if (scheduleData.doctorId !== doctorId) {
      throw new NotFoundException('Este horario no pertenece a tu agenda');
    }

    const preview = await this.schedulesService.getDeactivationPreview(
      doctorId,
      id,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Preview de desactivación obtenido exitosamente',
      data: preview,
    };
  }

  /**
   * DELETE /doctor/schedules/:id - Eliminar (desactivar) un horario
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un horario de tu agenda (soft delete)',
    description:
      'Desactiva un horario marcándolo como inactivo. Los slots futuros libres también se desactivan. ' +
      'Bloqueado si hay citas en las próximas 24h.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del horario (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horario desactivado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Horario no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Hay citas reservadas en las próximas 24 horas',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Este horario no pertenece a tu agenda',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
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
    const doctorId = await this.getDoctorIdFromUser(user.userId);

    // Verificar que el horario pertenece al doctor autenticado
    const scheduleData = await this.prisma.schedule.findUnique({
      where: { id },
      select: { doctorId: true },
    });

    if (!scheduleData) {
      throw new NotFoundException('Horario no encontrado');
    }

    if (scheduleData.doctorId !== doctorId) {
      throw new NotFoundException('Este horario no pertenece a tu agenda');
    }

    const result = await this.schedulesService.deactivateSchedule(
      doctorId,
      id,
      false, // Doctor nunca puede forzar
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Horario desactivado exitosamente',
      data: result,
    };
  }

  /**
   * GET /doctor/schedules/statistics - Obtener estadísticas de la agenda
   */
  @Get('statistics/summary')
  @ApiOperation({
    summary: 'Obtener estadísticas de tu agenda',
    description:
      'Obtiene estadísticas sobre horarios y slots (total, activos, reservados, etc.)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas obtenidas exitosamente',
  })
  async getStatistics(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<any>> {
    const doctorId = await this.getDoctorIdFromUser(user.userId);
    const stats = await this.schedulesService.getScheduleStatistics(doctorId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Estadísticas obtenidas exitosamente',
      data: stats,
    };
  }
}
