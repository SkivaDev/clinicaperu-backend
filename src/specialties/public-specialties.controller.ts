import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SpecialtiesService } from './specialties.service';
import { SpecialtyResponseDto } from './dto/specialty-response.dto';
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
    const specialties = await this.specialtiesService.listSpecialties();
    return {
      statusCode: HttpStatus.OK,
      message: 'Specialties retrieved successfully',
      data: specialties,
    };
  }
}
