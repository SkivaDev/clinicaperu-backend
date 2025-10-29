import {
  Controller,
  Get,
  Query,
  Param,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import {
  PublicDoctorListDto,
  PublicDoctorDetailDto,
} from './dto/public-doctor.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Doctores Públicos')
@Controller('public/doctors')
export class PublicDoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Listar doctores públicos',
    description:
      'Obtiene la lista de doctores activos con paginación y filtros (sin autenticación)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nombre o apellido',
  })
  @ApiQuery({
    name: 'specialtyId',
    required: false,
    description: 'Filtrar por ID de especialidad',
  })
  @ApiQuery({
    name: 'clinicId',
    required: false,
    description: 'Filtrar por ID de clínica',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Número de página',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Cantidad de resultados por página (máximo 100)',
  })
  @ApiOkResponse({
    description: 'Lista de doctores obtenida exitosamente',
  })
  async findAll(
    @Query('search') search?: string,
    @Query('specialtyId') specialtyId?: string,
    @Query('clinicId') clinicId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<
    ResponseDto<{
      doctors: PublicDoctorListDto[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>
  > {
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100); // max 100

    const result = await this.doctorsService.findPublicDoctors({
      search,
      specialtyId,
      clinicId,
      page: pageNum,
      limit: limitNum,
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Doctors retrieved successfully',
      data: {
        doctors: result.data,
        meta: result.meta,
      },
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalle de doctor público',
    description:
      'Obtiene información detallada de un doctor activo (sin autenticación)',
  })
  @ApiOkResponse({
    description: 'Doctor encontrado exitosamente',
    type: PublicDoctorDetailDto,
  })
  @ApiNotFoundResponse({
    description: 'Doctor no encontrado',
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<ResponseDto<PublicDoctorDetailDto>> {
    const doctor = await this.doctorsService.findPublicDoctorById(id);

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Doctor found successfully',
      data: doctor,
    };
  }
}
