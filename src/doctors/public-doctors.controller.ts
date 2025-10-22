import {
  Controller,
  Get,
  Query,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import {
  PublicDoctorListDto,
  PublicDoctorDetailDto,
} from './dto/public-doctor.dto';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('public')
@Controller('public/doctors')
export class PublicDoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List public doctors (no auth required)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name' })
  @ApiQuery({
    name: 'specialtyId',
    required: false,
    description: 'Filter by specialty',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async findAll(
    @Query('search') search?: string,
    @Query('specialtyId') specialtyId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<{
    data: PublicDoctorListDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100); // max 100

    return await this.doctorsService.findPublicDoctors({
      search,
      specialtyId,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get public doctor detail' })
  async findOne(@Param('id') id: string): Promise<PublicDoctorDetailDto> {
    const doctor = await this.doctorsService.findPublicDoctorById(id);

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    return doctor;
  }
}
