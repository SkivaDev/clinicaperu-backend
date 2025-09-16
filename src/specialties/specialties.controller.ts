import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { SpecialtiesService } from './specialties.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ResponseDto } from 'src/common/dto/response.dto';
import { SpecialtyResponseDto } from './dto/specialty-response.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/specialties')
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Post()
  async create(
    @Body() createSpecialtyDto: CreateSpecialtyDto,
  ): Promise<ResponseDto<SpecialtyResponseDto>> {
    const createdSpecialty =
      await this.specialtiesService.createSpecialty(createSpecialtyDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Specialty created successfully',
      data: createdSpecialty,
    };
  }

  @Get()
  async findAll(): Promise<ResponseDto<SpecialtyResponseDto[]>> {
    const specialties = await this.specialtiesService.listSpecialties();
    return {
      statusCode: HttpStatus.OK,
      message: 'Specialties found successfully',
      data: specialties,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<ResponseDto<SpecialtyResponseDto>> {
    const specialty = await this.specialtiesService.getSpecialtyById(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Specialty found successfully',
      data: specialty,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateSpecialtyDto: UpdateSpecialtyDto,
  ): Promise<ResponseDto<SpecialtyResponseDto>> {
    const updatedSpecialty = await this.specialtiesService.updateSpecialty(
      id,
      updateSpecialtyDto,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Specialty updated successfully',
      data: updatedSpecialty,
    };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
  ): Promise<ResponseDto<SpecialtyResponseDto>> {
    const deletedSpecialty = await this.specialtiesService.removeSpecialty(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Specialty deleted successfully',
      data: deletedSpecialty,
    };
  }
}
