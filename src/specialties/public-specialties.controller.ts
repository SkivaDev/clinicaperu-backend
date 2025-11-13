import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SpecialtiesService } from './specialties.service';
import { SpecialtyResponseDto } from './dto/specialty-response.dto';
import { SpecialtySortBy } from './dto/query-specialty.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Especialidades Públicas')
@Controller('public/specialties')
export class PublicSpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Listar especialidades públicas',
    description:
      'Obtiene la lista de todas las especialidades activas (sin autenticación)',
  })
  @ApiOkResponse({
    description: 'Lista de especialidades obtenida exitosamente',
    type: [SpecialtyResponseDto],
  })
  async findAll(): Promise<ResponseDto<SpecialtyResponseDto[]>> {
    const { data, meta } = await this.specialtiesService.listSpecialties({
      isActive: true,
      sortBy: SpecialtySortBy.NAME,
      sortOrder: 'asc',
      page: 1,
      limit: 100,
    });
    return {
      statusCode: HttpStatus.OK,
      message: 'Specialties retrieved successfully',
      data,
      meta: {
        totalCount: meta.total,
        pageCount: meta.totalPages,
        currentPage: meta.page,
        perPage: meta.limit,
        hasNextPage: meta.hasNextPage,
        hasPrevPage: meta.hasPrevPage,
      },
    };
  }
}
