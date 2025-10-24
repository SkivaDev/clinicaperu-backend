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
import { ResponseDto } from 'src/common/dto/response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ScheduleOwnershipGuard } from './guards/schedule-ownership.guard';

/**
 * Controller REST estándar para gestión de horarios (HU-020)
 * Implementa endpoints CRUD con control de acceso y validaciones
 */
@ApiTags('schedules')
@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SchedulesRestController {
  constructor(private readonly schedulesService: SchedulesService) {}

  /**
   * POST /schedules - Crear un nuevo horario
   * Solo ADMIN y DOCTOR pueden crear horarios
   */
  @Post()
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({
    summary: 'Crear un nuevo horario',
    description:
      'Crea un horario recurrente para un doctor. Valida overlaps y genera slots automáticamente.',
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
    @Body() createScheduleDto: CreateScheduleDto,
  ): Promise<ResponseDto<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.create(createScheduleDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Horario creado exitosamente',
      data: schedule,
    };
  }

  /**
   * GET /schedules - Listar horarios con filtros opcionales
   * Todos los usuarios autenticados pueden ver horarios
   */
  @Get()
  @ApiOperation({
    summary: 'Listar horarios con filtros',
    description:
      'Obtiene una lista de horarios. Puede filtrar por doctorId, dayOfWeek e isActive.',
  })
  @ApiQuery({
    name: 'doctorId',
    required: false,
    description: 'ID del doctor',
    type: String,
  })
  @ApiQuery({
    name: 'dayOfWeek',
    required: false,
    description: 'Día de la semana (0=Domingo, 6=Sábado)',
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
   * GET /schedules/:id - Obtener un horario por ID
   * Todos los usuarios autenticados pueden ver un horario específico
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un horario por ID',
    description:
      'Obtiene los detalles de un horario específico incluyendo sus slots.',
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

  /**
   * GET /doctors/:doctorId/schedules - Obtener horarios de un doctor
   * Endpoint de conveniencia para obtener todos los horarios de un doctor
   */
  @Get('doctors/:doctorId')
  @ApiOperation({
    summary: 'Obtener horarios de un doctor',
    description: 'Obtiene todos los horarios activos de un doctor específico.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Horarios del doctor obtenidos exitosamente',
    type: [ScheduleResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Doctor no encontrado',
  })
  async getDoctorSchedules(
    @Param('doctorId') doctorId: string,
  ): Promise<ResponseDto<ScheduleResponseDto[]>> {
    const schedules = await this.schedulesService.getDoctorSchedules(doctorId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Horarios del doctor obtenidos exitosamente',
      data: schedules,
    };
  }

  /**
   * PUT /schedules/:id - Actualizar un horario
   * Solo ADMIN o el doctor propietario pueden actualizar
   * No se puede actualizar si ya tiene slots generados
   */
  @Put(':id')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @UseGuards(ScheduleOwnershipGuard)
  @ApiOperation({
    summary: 'Actualizar un horario',
    description:
      'Actualiza un horario existente. No se puede actualizar si ya tiene slots generados.',
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
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No tienes permiso para modificar este horario',
  })
  async update(
    @Param('id') id: string,
    @Body() updateScheduleDto: Partial<CreateScheduleDto>,
  ): Promise<ResponseDto<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.update(id, updateScheduleDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Horario actualizado exitosamente',
      data: schedule,
    };
  }

  /**
   * DELETE /schedules/:id - Eliminar (desactivar) un horario
   * Solo ADMIN o el doctor propietario pueden eliminar
   * Implementa soft delete
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @UseGuards(ScheduleOwnershipGuard)
  @ApiOperation({
    summary: 'Eliminar un horario (soft delete)',
    description:
      'Desactiva un horario marcándolo como inactivo. Los slots futuros libres también se desactivan.',
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
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No tienes permiso para eliminar este horario',
  })
  async remove(
    @Param('id') id: string,
  ): Promise<ResponseDto<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Horario desactivado exitosamente',
      data: schedule,
    };
  }
}
