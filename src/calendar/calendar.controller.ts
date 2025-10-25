import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetCalendarQueryDto } from './dto/get-calendar-query.dto';
import { CalendarResponseDto } from './dto/calendar-response.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import type { CurrentUserPayload } from 'src/auth/types/current-user.interface';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CalendarEventsResponseDto } from './dto/calendar-event.dto';
import { CacheInterceptor } from 'src/common/interceptors/cache.interceptor';

@Controller('calendar')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // @Post()
  // create(@Body() createCalendarDto: CreateCalendarDto) {
  //   return this.calendarService.create(createCalendarDto);
  // }

  // @Get()
  // findAll() {
  //   return this.calendarService.findAll();
  // }

  @Get()
  @Roles(Role.DOCTOR, Role.PATIENT, Role.ADMIN)
  async getCalendar(
    @Query() query: GetCalendarQueryDto,
  ): Promise<ResponseDto<CalendarResponseDto>> {
    const calendar = await this.calendarService.getCalendar(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Calendar found successfully',
      data: calendar,
    };
  }

  @Get('doctor')
  @Roles(Role.DOCTOR)
  async getDoctorCalendar(
    @Query() query: GetCalendarQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<CalendarResponseDto>> {
    const calendar = await this.calendarService.getDoctorCalendar(
      query,
      user.userId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Doctor calendar found successfully',
      data: calendar,
    };
  }

  @Get('patient')
  @Roles(Role.PATIENT)
  async getPatientCalendar(
    @Query() query: GetCalendarQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<CalendarResponseDto>> {
    const calendar = await this.calendarService.getPatientCalendar(
      query,
      user.userId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Patient calendar found successfully',
      data: calendar,
    };
  }

  /**
   * HU-022: API de Calendario - Obtiene eventos (slots + appointments)
   * GET /calendar?doctorId=&patientId=&start=&end=&status=
   * Retorna slots libres y appointments en formato unificado
   * Cache: 60s TTL
   */
  @Get('events')
  @Roles(Role.DOCTOR, Role.PATIENT, Role.ADMIN)
  @UseInterceptors(new CacheInterceptor(60000)) // 60 segundos de cache
  async getCalendarEvents(
    @Query() query: CalendarQueryDto,
  ): Promise<ResponseDto<CalendarEventsResponseDto>> {
    const events = await this.calendarService.getCalendarEvents(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Calendar events retrieved successfully',
      data: events,
    };
  }
}
