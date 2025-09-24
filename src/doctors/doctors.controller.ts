import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import type { CreateDoctorDto } from './dto/create-doctor.dto';
import type { UpdateDoctorDto } from './dto/update-doctor.dto';
import { DoctorDetailDto } from './dto/doctor-detail.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { DoctorIdDto } from './dto/doctor-id.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UseGuards } from '@nestjs/common';
import { DoctorResponseDto } from './dto/doctor-response.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  async create(@Body() dto: CreateUserDto & CreateDoctorDto) {
    const doctor = await this.doctorsService.createDoctor(dto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Doctor created successfully',
      data: doctor,
    };
  }

  @Get()
  async findAll(): Promise<ResponseDto<DoctorResponseDto[]>> {
    const doctors = await this.doctorsService.listDoctors();
    return {
      statusCode: HttpStatus.OK,
      message: 'Doctors found successfully',
      data: doctors,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<ResponseDto<DoctorDetailDto>> {
    const doctor = await this.doctorsService.getDoctorDetail(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Doctor found successfully',
      data: doctor,
    };
  }

  @Get(':id/ids')
  async findIds(@Param('id') id: string): Promise<ResponseDto<DoctorIdDto>> {
    const doctor = await this.doctorsService.getDoctorIds(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Doctor IDs found successfully',
      data: doctor,
    };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDoctorDto: UpdateDoctorDto) {
    return this.doctorsService.updateDoctor(id, updateDoctorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.doctorsService.deleteDoctor(id);
  }
}
