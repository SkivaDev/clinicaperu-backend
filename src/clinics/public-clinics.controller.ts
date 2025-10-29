import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ClinicsService } from './clinics.service';
import { ClinicResponseDto } from './dto/clinic-response.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

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
  async findAll(): Promise<ResponseDto<ClinicResponseDto[]>> {
    const clinics = await this.clinicsService.listClinics();
    return {
      statusCode: HttpStatus.OK,
      message: 'Clinics retrieved successfully',
      data: clinics,
    };
  }
}
