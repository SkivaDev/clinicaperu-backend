import {
  Controller,
  Get,
  Query,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';
import { AvailabilityDashboardDto } from './dto/availability-dashboard.dto';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import { CacheInterceptor } from 'src/common/interceptors/cache.interceptor';

@ApiTags('Disponibilidad Pública')
@Controller('public/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /**
   * Dashboard de disponibilidad para pacientes
   * Retorna especialidades con stats, doctores con próximos slots y estadísticas globales
   * Optimizado con queries paralelas y cache de 1 minuto
   */
  @Public()
  @Get('dashboard')
  @UseInterceptors(new CacheInterceptor(60000)) // Cache 1 minuto
  @ApiOperation({
    summary: 'Dashboard de disponibilidad para pacientes',
    description:
      'Obtiene un dashboard completo con especialidades, doctores disponibles y sus próximos slots. ' +
      'Optimizado para la vista de disponibilidad del paciente. Cache: 60 segundos.',
  })
  @ApiQuery({
    name: 'specialtyId',
    required: false,
    description: 'Filtrar por ID de especialidad',
    example: 'specialty-uuid',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    description: 'Filtrar por ID de clínica',
    example: 'clinic-uuid',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description:
      'Fecha de inicio para buscar disponibilidad (ISO 8601). Por defecto: hoy',
    example: '2024-11-15T00:00:00.000Z',
  })
  @ApiOkResponse({
    description: 'Dashboard de disponibilidad obtenido exitosamente',
    type: AvailabilityDashboardDto,
  })
  async getDashboard(
    @Query() filters: DashboardFiltersDto,
  ): Promise<ResponseDto<AvailabilityDashboardDto>> {
    const data = await this.availabilityService.getDashboard(filters);

    return {
      statusCode: HttpStatus.OK,
      message: 'Availability dashboard retrieved successfully',
      data,
    };
  }
}
