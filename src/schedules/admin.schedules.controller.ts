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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { QueryScheduleDto } from './dto/query-schedule.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';
import { ResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * Controlador para que los administradores gestionen horarios de cualquier doctor
 * Ruta base: /admin/doctors/:doctorId/schedules
 * Seguridad: Solo administradores
 * Identificación: Recibe doctorId explícitamente en la URL
 */
@ApiTags('Admin - Gestión de Horarios de Doctores')
@Controller('admin/doctors/:doctorId/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminSchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  /**
   * POST /admin/doctors/:doctorId/schedules - Crear horario para un doctor
   */
  @Post()
  @ApiOperation({
    summary: 'Crear un horario para un doctor específico',
    description:
      'Permite a un administrador crear un horario para cualquier doctor del sistema.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
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
    status: HttpStatus.NOT_FOUND,
    description: 'Doctor no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'El horario se solapa con uno existente',
  })
  async create(
    @Param('doctorId') doctorId: string,
    @Body() createScheduleDto: Omit<CreateScheduleDto, 'doctorId'>,
  ): Promise<ResponseDto<ScheduleResponseDto>> {
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
   * GET /admin/doctors/:doctorId/schedules - Listar horarios de un doctor
   */
  @Get()
  @ApiOperation({
    summary: 'Obtener todos los horarios de un doctor',
    description:
      'Obtiene todos los horarios (activos e inactivos) de un doctor específico.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    description: 'Incluir horarios inactivos',
    type: Boolean,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horarios obtenidos exitosamente',
    type: [ScheduleResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Doctor no encontrado',
  })
  async getDoctorSchedules(
    @Param('doctorId') doctorId: string,
    @Query('includeInactive') includeInactive?: boolean,
  ): Promise<ResponseDto<ScheduleResponseDto[]>> {
    const schedules = includeInactive
      ? await this.schedulesService.getAllDoctorSchedules(doctorId)
      : await this.schedulesService.getDoctorSchedules(doctorId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Horarios obtenidos exitosamente',
      data: schedules,
    };
  }

  /**
   * GET /admin/doctors/:doctorId/schedules/:id - Obtener un horario específico
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un horario específico de un doctor',
    description: 'Obtiene los detalles de un horario específico con sus slots.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
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
  async findOne(
    @Param('doctorId') doctorId: string,
    @Param('id') id: string,
  ): Promise<ResponseDto<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Horario encontrado',
      data: schedule,
    };
  }

  /**
   * PUT /admin/doctors/:doctorId/schedules/:id - Actualizar un horario
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar un horario de un doctor',
    description:
      'Actualiza un horario existente. No se puede actualizar si ya tiene slots generados.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'ID del horario (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horario actualizado exitosamente',
    type: ScheduleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Horario no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'No se puede actualizar un horario con slots generados',
  })
  async update(
    @Param('doctorId') doctorId: string,
    @Param('id') id: string,
    @Body() updateScheduleDto: Partial<Omit<CreateScheduleDto, 'doctorId'>>,
  ): Promise<ResponseDto<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.update(id, updateScheduleDto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Horario actualizado exitosamente',
      data: schedule,
    };
  }

  /**
   * DELETE /admin/doctors/:doctorId/schedules/:id - Eliminar un horario
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un horario de un doctor (soft delete)',
    description:
      'Desactiva un horario marcándolo como inactivo. Los slots futuros libres también se desactivan.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'ID del horario (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horario desactivado exitosamente',
    type: ScheduleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Horario no encontrado',
  })
  async remove(
    @Param('doctorId') doctorId: string,
    @Param('id') id: string,
  ): Promise<ResponseDto<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.remove(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Horario desactivado exitosamente',
      data: schedule,
    };
  }

  /**
   * GET /admin/doctors/:doctorId/schedules/statistics/summary - Estadísticas
   */
  @Get('statistics/summary')
  @ApiOperation({
    summary: 'Obtener estadísticas de horarios de un doctor',
    description:
      'Obtiene estadísticas sobre horarios y slots del doctor (total, activos, reservados, etc.)',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas obtenidas exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Doctor no encontrado',
  })
  async getStatistics(
    @Param('doctorId') doctorId: string,
  ): Promise<ResponseDto<any>> {
    const stats = await this.schedulesService.getScheduleStatistics(doctorId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Estadísticas obtenidas exitosamente',
      data: stats,
    };
  }

  /**
   * POST /admin/doctors/:doctorId/schedules/regenerate - Regenerar slots
   */
  @Post('regenerate/slots')
  @ApiOperation({
    summary: 'Regenerar todos los slots de un doctor',
    description:
      'Regenera todos los slots para los horarios activos de un doctor. Útil para mantenimiento.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Slots regenerados exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Doctor no encontrado',
  })
  async regenerateSlots(
    @Param('doctorId') doctorId: string,
  ): Promise<ResponseDto<any>> {
    const result =
      await this.schedulesService.regenerateSlotsForDoctor(doctorId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Slots regenerados exitosamente',
      data: result,
    };
  }

  /**
   * PUT /admin/doctors/:doctorId/schedules/:id/reactivate - Reactivar horario
   */
  @Put(':id/reactivate')
  @ApiOperation({
    summary: 'Reactivar un horario inactivo',
    description:
      'Reactiva un horario previamente desactivado y regenera sus slots.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'ID del horario (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horario reactivado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Horario no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'El horario ya está activo',
  })
  async reactivateSchedule(
    @Param('doctorId') doctorId: string,
    @Param('id') id: string,
  ): Promise<ResponseDto<any>> {
    const result = await this.schedulesService.reactivateSchedule(doctorId, id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Horario reactivado exitosamente',
      data: result,
    };
  }
}

/**
 * Controlador adicional para endpoints generales de administración
 * Ruta base: /admin/schedules
 */
@ApiTags('Admin - Gestión General de Horarios')
@Controller('admin/schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminSchedulesGeneralController {
  constructor(private readonly schedulesService: SchedulesService) {}

  /**
   * GET /admin/schedules - Listar todos los horarios con filtros
   */
  @Get()
  @ApiOperation({
    summary: 'Listar todos los horarios del sistema',
    description:
      'Obtiene una lista de todos los horarios con filtros opcionales (doctorId, dayOfWeek, isActive).',
  })
  @ApiQuery({
    name: 'doctorId',
    required: false,
    description: 'Filtrar por ID del doctor',
    type: String,
  })
  @ApiQuery({
    name: 'dayOfWeek',
    required: false,
    description: 'Filtrar por día de la semana (0=Domingo, 6=Sábado)',
    type: Number,
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filtrar por estado activo/inactivo',
    type: Boolean,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de horarios obtenida exitosamente',
    type: [ScheduleResponseDto],
  })
  async findAll(
    @Query() query: QueryScheduleDto,
  ): Promise<ResponseDto<ScheduleResponseDto[]>> {
    const schedules = await this.schedulesService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Horarios obtenidos exitosamente',
      data: schedules,
    };
  }

  /**
   * GET /admin/schedules/:id - Obtener un horario por ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un horario específico por ID',
    description: 'Obtiene los detalles de cualquier horario del sistema.',
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
  async findOne(
    @Param('id') id: string,
  ): Promise<ResponseDto<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.findOne(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Horario encontrado',
      data: schedule,
    };
  }
}
