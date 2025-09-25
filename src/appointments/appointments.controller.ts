// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Query,
//   Param,
//   Patch,
//   HttpStatus,
//   UseGuards,
// } from '@nestjs/common';
// import { AppointmentsService } from './appointments.service';
// import { CreateAppointmentDto } from './dto/create-appointment.dto';
// import { CalendarQueryDto } from './dto/calendar-query.dto';
// import { CalendarEventDto } from './dto/calendar-event.dto';
// import { AppointmentEntity } from './entities/appointment.entity';
// import { ResponseDto } from '../common/dto/response.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { Role, AppointmentStatus } from '@prisma/client';

// @UseGuards(JwtAuthGuard, RolesGuard)
// @Controller('appointments')
// export class AppointmentsController {
//   constructor(private readonly appointmentsService: AppointmentsService) {}

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

//   @Get(':id')
//   @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
//   async getAppointmentById(
//     @Param('id') id: string,
//   ): Promise<ResponseDto<AppointmentEntity>> {
//     const appointment = await this.appointmentsService.getAppointmentById(id);

//     return {
//       statusCode: HttpStatus.OK,
//       message: 'Appointment retrieved successfully',
//       data: appointment,
//     };
//   }

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
// }
