import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ClinicsService } from './clinics.service';
import { ClinicResponseDto } from './dto/clinic-response.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';
import { QueryClinicDto } from './dto/query-clinic.dto';

@ApiTags('Clínicas Públicas')
@Controller('public/clinics')
export class PublicClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Listar clínicas públicas',
    description: 'Obtiene la lista de todas las clínicas (sin autenticación)',
  })
  @ApiOkResponse({
    description: 'Lista de clínicas obtenida exitosamente',
    type: [ClinicResponseDto],
  })
  async findAll(
    @Query() query: QueryClinicDto,
  ): Promise<ResponseDto<ClinicResponseDto[]>> {
    const filters: QueryClinicDto = {
      ...query,
      isActive: query.isActive ?? true,
    };

    const result = await this.clinicsService.listClinics(filters);
    return {
      statusCode: HttpStatus.OK,
      message: 'Clínicas obtenidas exitosamente',
      data: result.data,
      stats: result.stats,
      meta: result.meta,
    };
  }
}
