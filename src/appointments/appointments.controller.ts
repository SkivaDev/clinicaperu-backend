import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Patch,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CalendarEventDto } from './dto/calendar-event.dto';
import { AppointmentEntity } from './entities/appointment.entity';
import { ResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, AppointmentStatus } from '@prisma/client';
import { AppointmentResponseDto } from './dto/appointment-response.dto';

@ApiTags('Gestión de Citas')
@ApiBearerAuth('bearerAuth')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'Token JWT inválido o expirado' })
@ApiForbiddenResponse({ description: 'Acceso denegado - Se requiere autenticación' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  //   @Post()
  //   @Roles(Role.PATIENT, Role.ADMIN)
  //   async createAppointment(
  //     @Body() createAppointmentDto: CreateAppointmentDto,
  //   ): Promise<ResponseDto<AppointmentEntity>> {
  //     const appointment =
  //       await this.appointmentsService.createAppointment(createAppointmentDto);

  //     return {
  //       statusCode: HttpStatus.CREATED,
  //       message: 'Appointment created successfully',
  //       data: appointment,
  //     };
  //   }

  //   @Get('calendar')
  //   @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  //   async getCalendarEvents(
  //     @Query() query: CalendarQueryDto,
  //   ): Promise<ResponseDto<CalendarEventDto[]>> {
  //     const events = await this.appointmentsService.getCalendarEvents(query);

  //     return {
  //       statusCode: HttpStatus.OK,
  //       message: 'Calendar events retrieved successfully',
  //       data: events,
  //     };
  //   }
  @Get(':id')
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ 
    summary: 'Obtener cita por ID',
    description: 'Obtiene los detalles de una cita específica por su ID'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la cita',
    example: 'uuid-here'
  })
  @ApiOkResponse({
    description: 'Cita obtenida exitosamente',
    type: ResponseDto<AppointmentResponseDto>
  })
  @ApiResponse({
    status: 404,
    description: 'Cita no encontrada'
  })
  async getAppointmentById(
    @Param('id') id: string,
  ): Promise<ResponseDto<AppointmentResponseDto>> {
    const appointment = await this.appointmentsService.getAppointmentById(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Appointment retrieved successfully',
      data: appointment,
    };
  }

  @Get()
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ 
    summary: 'Listar todas las citas',
    description: 'Obtiene la lista completa de citas del sistema'
  })
  @ApiOkResponse({
    description: 'Lista de citas obtenida exitosamente',
    type: ResponseDto<AppointmentResponseDto[]>
  })
  async getAllAppointments(): Promise<ResponseDto<AppointmentResponseDto[]>> {
    const appointments = await this.appointmentsService.getAllAppointments();

    return {
      statusCode: HttpStatus.OK,
      message: 'Appointments retrieved successfully',
      data: appointments,
    };
  }

  //   @Patch(':id/status')
  //   @Roles(Role.DOCTOR, Role.ADMIN)
  //   async updateAppointmentStatus(
  //     @Param('id') id: string,
  //     @Body('status') status: AppointmentStatus,
  //   ): Promise<ResponseDto<AppointmentEntity>> {
  //     const appointment = await this.appointmentsService.updateAppointmentStatus(
  //       id,
  //       status,
  //     );

  //     return {
  //       statusCode: HttpStatus.OK,
  //       message: 'Appointment status updated successfully',
  //       data: appointment,
  //     };
  //   }
}
