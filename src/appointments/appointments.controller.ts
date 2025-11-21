import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
  UseGuards,
  Req,
  Delete,
  Put,
  Patch,
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
import { ResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { DoctorBookAppointmentDto } from './dto/doctor-book-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CurrentUser } from '../auth/decorators/user.decorator';
import type { CurrentUserPayload } from '../auth/types/current-user.interface';
import { DoctorSlotOwnershipGuard } from './guards/doctor-slot-ownership.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Gestión de Citas')
@ApiBearerAuth('bearerAuth')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'Token JWT inválido o expirado' })
@ApiForbiddenResponse({
  description: 'Acceso denegado - Se requiere autenticación',
})
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
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 bookings por minuto
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
    description:
      'El slot no está disponible o está siendo reservado por otro usuario',
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
    const requestId =
      request.headers['x-request-id'] ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const appointment = await this.bookingService.bookSlot(
      user.userId,
      bookingDto,
      user.role as 'PATIENT' | 'ADMIN',
      requestId,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Appointment booked successfully',
      data: appointment,
    };
  }

  /**
   * HU-024: Doctor Books for Patient - Doctor reserva slot para paciente
   * POST /doctor/appointments con { slotId, patientId, reason }
   * Reutiliza lógica transaccional de HU-023
   */
  @Post('doctor/appointments')
  @Throttle({ default: { ttl: 60000, limit: 20 } }) // 20 bookings por minuto (doctores)
  @Roles(Role.DOCTOR)
  @UseGuards(DoctorSlotOwnershipGuard)
  @ApiOperation({
    summary: 'Doctor reserva slot para paciente',
    description:
      'Permite a un doctor reservar un slot de su agenda para un paciente específico. Útil para citas de seguimiento.',
  })
  @ApiOkResponse({
    description: 'Cita creada exitosamente por el doctor',
    type: ResponseDto<BookingResponseDto>,
  })
  @ApiConflictResponse({
    description: 'El slot no está disponible o no pertenece al doctor',
  })
  @ApiBadRequestResponse({
    description: 'Datos inválidos o slot no cumple requisitos',
  })
  @ApiForbiddenResponse({
    description: 'El slot no pertenece al doctor autenticado',
  })
  async doctorBookAppointment(
    @Body() bookingDto: DoctorBookAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: any,
  ): Promise<ResponseDto<BookingResponseDto>> {
    // Generar request ID para tracking
    const requestId =
      request.headers['x-request-id'] ||
      `req_doctor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const appointment = await this.bookingService.bookSlotForPatient(
      bookingDto.patientId,
      bookingDto.slotId,
      bookingDto.reason,
      bookingDto.notes,
      requestId,
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Appointment booked successfully by doctor',
      data: appointment,
    };
  }

  /**
   * HU-025: Obtener cita por ID
   * GET /appointments/:id
   * Obtiene los detalles de una cita específica por su ID
   */
  @Get(':id')
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener cita por ID',
    description: 'Obtiene los detalles de una cita específica por su ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la cita',
    example: 'uuid-here',
  })
  @ApiOkResponse({
    description: 'Cita obtenida exitosamente',
    type: ResponseDto<AppointmentResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Cita no encontrada',
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

  /**
   * Listar mis citas
   * GET /appointments
   * Obtiene las citas del usuario autenticado. Pacientes ven solo sus citas, doctores ven las citas de sus pacientes, admins ven todas.
   */
  @Get()
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Listar mis citas',
    description:
      'Obtiene las citas del usuario autenticado. Pacientes ven solo sus citas, doctores ven las citas de sus pacientes, admins ven todas.',
  })
  @ApiOkResponse({
    description: 'Lista de citas obtenida exitosamente',
  })
  async getMyAppointments(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<any[]>> {
    const appointments = await this.appointmentsService.getMyAppointments(
      user.userId,
      user.role,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Appointments retrieved successfully',
      data: appointments,
    };
  }

  /**
   * Listar citas de hoy
   * GET /appointments/today
   * Obtiene las citas del día actual del doctor autenticado
   */
  @Get('today')
  @Roles(Role.DOCTOR)
  @ApiOperation({
    summary: 'Listar citas de hoy',
    description:
      'Obtiene las citas del día actual del doctor autenticado, ordenadas por hora de inicio.',
  })
  @ApiOkResponse({
    description: 'Lista de citas de hoy obtenida exitosamente',
  })
  async getTodayAppointments(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<any[]>> {
    const appointments = await this.appointmentsService.getTodayAppointments(
      user.userId,
      user.role,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Today appointments retrieved successfully',
      data: appointments,
    };
  }

  /**
   * Confirma una cita que está en estado PENDING
   * Solo el paciente propietario puede confirmar su cita
   */
  @Patch(':id/confirm')
  @Roles(Role.PATIENT, Role.ADMIN)
  @ApiOperation({
    summary: 'Confirmar una cita pendiente',
    description:
      'Confirma una cita que está en estado PENDING. Solo el paciente propietario puede confirmar su cita. Los admins también pueden confirmar cualquier cita.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la cita a confirmar',
    example: 'uuid-here',
  })
  @ApiOkResponse({
    description: 'Cita confirmada exitosamente',
    type: ResponseDto<AppointmentResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'La cita no está en estado PENDING o no se puede confirmar',
  })
  @ApiForbiddenResponse({
    description: 'Solo el paciente propietario puede confirmar esta cita',
  })
  @ApiResponse({
    status: 404,
    description: 'Cita no encontrada',
  })
  async confirmAppointment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<AppointmentResponseDto>> {
    const appointment = await this.appointmentsService.confirmAppointment(
      id,
      user.userId,
      user.role,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Cita confirmada exitosamente',
      data: appointment,
    };
  }

  /**
   * Marca una cita como atendida
   * Solo el doctor asignado o un admin puede marcar asistencia
   */
  @Patch(':id/attend')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Marcar cita como atendida',
    description:
      'Marca una cita CONFIRMED como ATTENDED. Solo el doctor asignado puede marcar asistencia. Los admins también pueden marcar cualquier cita. Solo se puede marcar citas del día actual o pasadas.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la cita a marcar como atendida',
    example: 'uuid-here',
  })
  @ApiOkResponse({
    description: 'Cita marcada como atendida exitosamente',
    type: ResponseDto<AppointmentResponseDto>,
  })
  @ApiBadRequestResponse({
    description:
      'La cita no está en estado CONFIRMED, es futura, o no se puede marcar como atendida',
  })
  @ApiForbiddenResponse({
    description: 'Solo el doctor asignado puede marcar esta cita como atendida',
  })
  @ApiResponse({
    status: 404,
    description: 'Cita no encontrada',
  })
  async markAsAttended(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<AppointmentResponseDto>> {
    const appointment = await this.appointmentsService.markAsAttended(
      id,
      user.userId,
      user.role,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Cita marcada como atendida exitosamente',
      data: appointment,
    };
  }

  /**
   * HU-026: DELETE /appointments/:id - Cancelar cita
   * Validación: solo si startAt > now + 24h (paciente)
   * Doctor y Admin pueden cancelar sin restricción de tiempo
   */
  @Delete(':id')
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Cancelar una cita',
    description:
      'Cancela una cita existente. Los pacientes solo pueden cancelar con más de 24h de anticipación. Doctores y admins pueden cancelar sin restricción.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la cita a cancelar',
    example: 'uuid-here',
  })
  @ApiOkResponse({
    description: 'Cita cancelada exitosamente',
    type: ResponseDto<AppointmentResponseDto>,
  })
  @ApiBadRequestResponse({
    description:
      'No se puede cancelar citas con menos de 24h de anticipación o la cita ya está cancelada/atendida',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para cancelar esta cita',
  })
  @ApiResponse({
    status: 404,
    description: 'Cita no encontrada',
  })
  async cancelAppointment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<AppointmentResponseDto>> {
    const appointment = await this.appointmentsService.cancelAppointment(
      id,
      user.userId,
      user.role,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Cita cancelada exitosamente',
      data: appointment,
    };
  }

  /**
   * HU-026: PUT /appointments/:id/reschedule - Reprogramar cita
   * Validación: solo si startAt > now + 24h
   * Solo el paciente propietario o un admin pueden reprogramar
   */
  @Put(':id/reschedule')
  @Roles(Role.PATIENT, Role.ADMIN)
  @ApiOperation({
    summary: 'Reprogramar una cita',
    description:
      'Reprograma una cita a un nuevo slot. Solo se puede reprogramar con más de 24h de anticipación.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la cita a reprogramar',
    example: 'uuid-here',
  })
  @ApiOkResponse({
    description: 'Cita reprogramada exitosamente',
    type: ResponseDto<AppointmentResponseDto>,
  })
  @ApiConflictResponse({
    description: 'El nuevo slot ya está reservado',
  })
  @ApiBadRequestResponse({
    description:
      'No se puede reprogramar citas con menos de 24h o el nuevo slot no pertenece al mismo doctor',
  })
  @ApiForbiddenResponse({
    description: 'Solo el paciente puede reprogramar su cita',
  })
  @ApiResponse({
    status: 404,
    description: 'Cita o nuevo slot no encontrado',
  })
  async rescheduleAppointment(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<AppointmentResponseDto>> {
    const appointment = await this.appointmentsService.rescheduleAppointment(
      id,
      user.userId,
      user.role,
      dto,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Cita reprogramada exitosamente',
      data: appointment,
    };
  }
}
