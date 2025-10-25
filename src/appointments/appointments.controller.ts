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
  Req,
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
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { BookingService } from './booking.service';
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
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CurrentUser } from '../auth/decorators/user.decorator';
import type { CurrentUserPayload } from '../auth/types/current-user.interface';

@ApiTags('Gestión de Citas')
@ApiBearerAuth('bearerAuth')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'Token JWT inválido o expirado' })
@ApiForbiddenResponse({ description: 'Acceso denegado - Se requiere autenticación' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly bookingService: BookingService,
  ) {}

  /**
   * HU-023: Atomic Booking - Reserva un slot de forma atómica
   * POST /appointments con { slotId, reason }
   * Garantiza que solo un paciente pueda reservar un slot
   */
  @Post()
  @Roles(Role.PATIENT, Role.ADMIN)
  @ApiOperation({
    summary: 'Reservar un slot (Atomic Booking)',
    description:
      'Crea una cita reservando un slot de forma atómica. Maneja concurrencia con transacciones y locks.',
  })
  @ApiOkResponse({
    description: 'Cita creada exitosamente',
    type: ResponseDto<BookingResponseDto>,
  })
  @ApiConflictResponse({
    description: 'El slot no está disponible o está siendo reservado por otro usuario',
  })
  @ApiBadRequestResponse({
    description: 'Datos inválidos o slot no cumple requisitos',
  })
  async bookAppointment(
    @Body() bookingDto: BookAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: any,
  ): Promise<ResponseDto<BookingResponseDto>> {
    // Generar request ID para tracking
    const requestId = request.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const appointment = await this.bookingService.bookSlot(
      user.userId,
      bookingDto,
      requestId,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Appointment booked successfully',
      data: appointment,
    };
  }

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
