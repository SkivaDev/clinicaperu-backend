import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ClinicsService } from './clinics.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { ClinicResponseDto } from './dto/clinic-response.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/clinics')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Post()
  async create(
    @Body() createClinicDto: CreateClinicDto,
  ): Promise<ResponseDto<ClinicResponseDto>> {
    const clinic = await this.clinicsService.createClinic(createClinicDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Clinic created successfully',
      data: clinic,
    };
  }

  @Get()
  async findAll(): Promise<ResponseDto<ClinicResponseDto[]>> {
    const clinics = await this.clinicsService.listClinics();
    return {
      statusCode: HttpStatus.OK,
      message: 'Clinics found successfully',
      data: clinics,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<ResponseDto<ClinicResponseDto>> {
    const clinic = await this.clinicsService.getClinicById(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Clinic found successfully',
      data: clinic,
    };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClinicDto: UpdateClinicDto) {
    return this.clinicsService.updateClinic(id, updateClinicDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deletedClinic = await this.clinicsService.deleteClinic(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Clinic deleted successfully',
      data: deletedClinic,
    };
  }
}
