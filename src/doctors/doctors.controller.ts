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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import type { CreateDoctorDto } from './dto/create-doctor.dto';
import type { UpdateDoctorDto } from './dto/update-doctor.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { DoctorIdDto } from './dto/doctor-id.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { DoctorResponseDto } from './dto/doctor-response.dto';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';

@ApiTags('Gestión de Doctores')
@ApiBearerAuth('bearerAuth')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'Token JWT inválido o expirado' })
@ApiForbiddenResponse({ description: 'Acceso denegado - Se requiere rol de ADMIN' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Crear nuevo doctor',
    description: 'Crea un nuevo doctor en el sistema (solo administradores)'
  })
  @ApiBody({ 
    description: 'Datos del doctor a crear',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/CreateUserDto' },
        { $ref: '#/components/schemas/CreateDoctorDto' }
      ]
    }
  })
  @ApiCreatedResponse({
    description: 'Doctor creado exitosamente',
    type: ResponseDto<DoctorResponseDto>
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos'
  })
  async create(
    @Body() dto: CreateUserDto & CreateDoctorDto,
  ): Promise<ResponseDto<DoctorResponseDto>> {
    const doctor = await this.doctorsService.createDoctor(dto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Doctor created successfully',
      data: doctor,
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Listar todos los doctores',
    description: 'Obtiene la lista completa de doctores del sistema'
  })
  @ApiOkResponse({
    description: 'Lista de doctores obtenida exitosamente',
    type: ResponseDto<DoctorResponseDto[]>
  })
  async findAll(): Promise<ResponseDto<DoctorResponseDto[]>> {
    const doctors = await this.doctorsService.listDoctors();
    return {
      statusCode: HttpStatus.OK,
      message: 'Doctors found successfully',
      data: doctors,
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener doctor por ID',
    description: 'Obtiene los detalles de un doctor específico por su ID'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del doctor',
    example: 'uuid-here'
  })
  @ApiOkResponse({
    description: 'Doctor encontrado exitosamente',
    type: ResponseDto<DoctorResponseDto>
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor no encontrado'
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<ResponseDto<DoctorResponseDto>> {
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
  @ApiOperation({ 
    summary: 'Actualizar doctor',
    description: 'Actualiza la información de un doctor existente'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del doctor',
    example: 'uuid-here'
  })
  @ApiBody({ 
    description: 'Datos del doctor a actualizar',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/UpdateUserDto' },
        { $ref: '#/components/schemas/UpdateDoctorDto' }
      ]
    }
  })
  @ApiOkResponse({
    description: 'Doctor actualizado exitosamente',
    type: ResponseDto<DoctorResponseDto>
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor no encontrado'
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos'
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto & UpdateDoctorDto,
  ): Promise<ResponseDto<DoctorResponseDto>> {
    const doctorUpdated = await this.doctorsService.updateDoctor(id, dto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Doctor updated successfully',
      data: doctorUpdated,
    };
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Eliminar doctor',
    description: 'Elimina un doctor del sistema (soft delete)'
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del doctor',
    example: 'uuid-here'
  })
  @ApiOkResponse({
    description: 'Doctor eliminado exitosamente',
    type: ResponseDto<DoctorResponseDto>
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor no encontrado'
  })
  async remove(
    @Param('id') id: string,
  ): Promise<ResponseDto<DoctorResponseDto>> {
    const doctorDeleted = await this.doctorsService.deleteDoctor(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Doctor deleted successfully',
      data: doctorDeleted,
    };
  }

  // @Get(':id/schedules')
  // async getDoctorSchedules(@Param('id') id: string) {
  //   return this.schedulesService.getDoctorSchedules(id);
  // }

  // @Patch(':id/schedules')
  // async updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
  //   return this.schedulesService.updateSchedule(id, dto);
  // }
}
