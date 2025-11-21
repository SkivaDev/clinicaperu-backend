import {
  Controller,
  Get,
  HttpStatus,
  UseGuards,
  Query,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { ResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { Role } from '@prisma/client';
import type { CurrentUserPayload } from '../auth/types/current-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  DoctorStatisticsDto,
  StatisticsQueryDto,
  DateRangeEnum,
} from './dto/doctor-statistics.dto';
import { CacheInterceptor } from '../common/interceptors/cache.interceptor';

/**
 * Controlador para estadísticas del doctor
 * Ruta base: /doctors/statistics
 * Seguridad: Solo doctores autenticados
 * Cache: 5 minutos (300000ms)
 */
@ApiTags('Doctor - Estadísticas')
@Controller('doctors/statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
@ApiBearerAuth()
export class DoctorStatisticsController {
  constructor(
    private readonly doctorsService: DoctorsService,
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
   * GET /doctors/statistics - Obtener estadísticas del doctor autenticado
   * El doctorId se obtiene automáticamente del token JWT
   * Cache: 5 minutos
   */
  @Get()
  @UseInterceptors(new CacheInterceptor(300000)) // 5 minutos = 300000ms
  @ApiOperation({
    summary: 'Obtener estadísticas de desempeño',
    description:
      'Obtiene estadísticas completas del doctor autenticado: métricas del mes actual, históricas (últimos 6 meses) y generales. Cache de 5 minutos.',
  })
  @ApiQuery({
    name: 'dateRange',
    description: 'Rango de fechas para las estadísticas',
    enum: DateRangeEnum,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas obtenidas exitosamente',
    type: ResponseDto<DoctorStatisticsDto>,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Doctor no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado - Token inválido o expirado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acceso denegado - Se requiere rol de DOCTOR',
  })
  async getStatistics(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: StatisticsQueryDto,
  ): Promise<ResponseDto<DoctorStatisticsDto>> {
    // Obtener doctorId del usuario autenticado
    const doctorId = await this.getDoctorIdFromUser(user.userId);

    // Obtener estadísticas
    const statistics = await this.doctorsService.getStatistics(
      doctorId,
      query.dateRange,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Estadísticas obtenidas exitosamente',
      data: statistics,
    };
  }

  /**
   * GET /doctors/statistics/dashboard - Obtener estadísticas del dashboard
   * Métricas rápidas para el dashboard del doctor
   */
  @Get('dashboard')
  @UseInterceptors(new CacheInterceptor(60000)) // 1 minuto = 60000ms
  @ApiOperation({
    summary: 'Obtener estadísticas del dashboard',
    description:
      'Obtiene métricas rápidas para el dashboard: citas de hoy, reportes pendientes, total de pacientes y calificación. Cache de 1 minuto.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas del dashboard obtenidas exitosamente',
  })
  async getDashboardStats(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<any>> {
    const stats = await this.doctorsService.getDashboardStats(user.userId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Estadísticas del dashboard obtenidas exitosamente',
      data: stats,
    };
  }

  /**
   * GET /doctors/statistics/recent-patients - Obtener pacientes recientes
   * Lista de pacientes atendidos recientemente (últimos 30 días)
   */
  @Get('recent-patients')
  @UseInterceptors(new CacheInterceptor(300000)) // 5 minutos = 300000ms
  @ApiOperation({
    summary: 'Obtener pacientes recientes',
    description:
      'Obtiene la lista de pacientes atendidos recientemente (últimos 30 días). Cache de 5 minutos.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pacientes recientes obtenidos exitosamente',
  })
  async getRecentPatients(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<any>> {
    const patients = await this.doctorsService.getRecentPatients(user.userId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Pacientes recientes obtenidos exitosamente',
      data: patients,
    };
  }
}
