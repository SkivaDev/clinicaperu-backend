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
  HttpCode,
  Query,
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
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { DoctorIdDto } from './dto/doctor-id.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import {
  CanDeactivateDoctorResponseDto,
  DoctorResponseDto,
} from './dto/doctor-response.dto';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { DoctorDeactivateGuard } from './guards/doctor-deactivate.guard';
import { QueryDoctorDto } from './dto/query-doctor.dto';

@ApiTags('Gestión de Doctores')
@ApiBearerAuth('bearerAuth')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'Token JWT inválido o expirado' })
@ApiForbiddenResponse({
  description: 'Acceso denegado - Se requiere rol de ADMIN',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  // @Post()
  // @ApiOperation({
  //   summary: 'Crear nuevo doctor',
  //   description: 'Crea un nuevo doctor en el sistema (solo administradores)',
  // })
  // @ApiBody({
  //   description: 'Datos del doctor a crear',
  //   schema: {
  //     allOf: [
  //       { $ref: '#/components/schemas/CreateUserDto' },
  //       { $ref: '#/components/schemas/CreateDoctorDto' },
  //     ],
  //   },
  // })
  // @ApiCreatedResponse({
  //   description: 'Doctor creado exitosamente',
  //   type: ResponseDto<DoctorResponseDto>,
  // })
  // @ApiResponse({
  //   status: 400,
  //   description: 'Datos de entrada inválidos',
  // })
  // async create(
  //   @Body() dto: CreateUserDto & CreateDoctorDto,
  // ): Promise<ResponseDto<DoctorResponseDto>> {
  //   const doctor = await this.doctorsService.createDoctor(dto);
  //   return {
  //     statusCode: HttpStatus.OK,
  //     message: 'Doctor created successfully',
  //     data: doctor,
  //   };
  // }

  // ===========================================================================
  // 🟢 Crear doctor
  // ===========================================================================
  @Post()
  @ApiOperation({
    summary: 'Crear nuevo doctor (User + Doctor)',
    description:
      'Crea un nuevo doctor junto a su usuario asociado. Solo para administradores.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Doctor creado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Ya existe un doctor con ese CMP o email',
  })
  @ApiBody({ type: CreateDoctorDto })
  async create(
    @Body() dto: CreateDoctorDto,
  ): Promise<ResponseDto<DoctorResponseDto>> {
    const doctor = await this.doctorsService.createDoctor(dto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Doctor creado exitosamente',
      data: doctor,
    };
  }

  /**
   * Obtiene la lista completa de doctores del sistema
   */
  @Get()
  @ApiOperation({
    summary: 'Listar todos los doctores',
    description: 'Obtiene la lista completa de doctores del sistema',
  })
  @ApiOkResponse({
    description: 'Lista de doctores obtenida exitosamente',
    type: ResponseDto<DoctorResponseDto[]>,
  })
  async findAll(
    @Query() query: QueryDoctorDto,
  ): Promise<ResponseDto<DoctorResponseDto[]>> {
    const result = await this.doctorsService.listDoctors(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Doctores obtenidos exitosamente',
      data: result.data,
      stats: result.stats,
      meta: result.meta,
    };
  }

  /**
   * Obtiene los detalles de un doctor específico por su ID
   */
  // @Get(':id')
  // @ApiOperation({
  //   summary: 'Obtener doctor por ID',
  //   description: 'Obtiene los detalles de un doctor específico por su ID',
  // })
  // @ApiParam({
  //   name: 'id',
  //   description: 'ID único del doctor',
  //   example: 'uuid-here',
  // })
  // @ApiOkResponse({
  //   description: 'Doctor encontrado exitosamente',
  //   type: ResponseDto<DoctorResponseDto>,
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: 'Doctor no encontrado',
  // })
  // async findOne(
  //   @Param('id') id: string,
  // ): Promise<ResponseDto<DoctorResponseDto>> {
  //   const doctor = await this.doctorsService.getDoctorDetail(id);
  //   return {
  //     statusCode: HttpStatus.OK,
  //     message: 'Doctor found successfully',
  //     data: doctor,
  //   };
  // }

  // ===========================================================================
  // 🔍 Obtener doctor por ID
  // ===========================================================================
  @Get(':id')
  @ApiOperation({ summary: 'Obtener doctor por ID' })
  @ApiParam({ name: 'id', description: 'ID del doctor' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Doctor encontrado',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Doctor no encontrado',
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<ResponseDto<DoctorResponseDto>> {
    const doctor = await this.doctorsService.getDoctorById(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Doctor encontrado exitosamente',
      data: doctor,
    };
  }

  // ===========================================================================
  // 🔍 Obtener IDs de doctor
  // ===========================================================================
  @Get(':id/ids')
  async findIds(@Param('id') id: string): Promise<ResponseDto<DoctorIdDto>> {
    const doctor = await this.doctorsService.getDoctorIds(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Doctor IDs found successfully',
      data: doctor,
    };
  }

  // @Patch(':id')
  // @ApiOperation({
  //   summary: 'Actualizar doctor',
  //   description: 'Actualiza la información de un doctor existente',
  // })
  // @ApiParam({
  //   name: 'id',
  //   description: 'ID único del doctor',
  //   example: 'uuid-here',
  // })
  // @ApiBody({
  //   description: 'Datos del doctor a actualizar',
  //   schema: {
  //     allOf: [
  //       { $ref: '#/components/schemas/UpdateUserDto' },
  //       { $ref: '#/components/schemas/UpdateDoctorDto' },
  //     ],
  //   },
  // })
  // @ApiOkResponse({
  //   description: 'Doctor actualizado exitosamente',
  //   type: ResponseDto<DoctorResponseDto>,
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: 'Doctor no encontrado',
  // })
  // @ApiResponse({
  //   status: 400,
  //   description: 'Datos de entrada inválidos',
  // })
  // async update(
  //   @Param('id') id: string,
  //   @Body() dto: UpdateUserDto & UpdateDoctorDto,
  // ): Promise<ResponseDto<DoctorResponseDto>> {
  //   const doctorUpdated = await this.doctorsService.updateDoctor(id, dto);
  //   return {
  //     statusCode: HttpStatus.OK,
  //     message: 'Doctor updated successfully',
  //     data: doctorUpdated,
  //   };
  // }

  // ===========================================================================
  // 🔄 Actualizar doctor (incluye desactivación)
  // ===========================================================================
  @Patch(':id')
  @UseGuards(DoctorDeactivateGuard)
  @ApiOperation({
    summary: 'Actualizar doctor (incluye activación/desactivación)',
  })
  @ApiBody({ type: UpdateDoctorDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto,
  ): Promise<ResponseDto<DoctorResponseDto>> {
    const updated = await this.doctorsService.updateDoctor(id, dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Doctor actualizado exitosamente',
      data: updated,
    };
  }

  // ===========================================================================
  // 🔎 Validar si puede desactivarse
  // ===========================================================================
  @Get(':id/can-deactivate')
  @ApiOperation({
    summary:
      'Verificar si un doctor puede ser desactivado (para validación en UI)',
  })
  async canDeactivate(
    @Param('id') id: string,
  ): Promise<ResponseDto<CanDeactivateDoctorResponseDto>> {
    const validation = await this.doctorsService.canDeactivate(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Validación completada',
      data: validation,
    };
  }

  // ===========================================================================
  // 🔒 Desactivar doctor explícitamente
  // ===========================================================================
  @Patch(':id/deactivate')
  @UseGuards(DoctorDeactivateGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactivar doctor con validación estricta',
    description:
      'Desactiva un doctor solo si no tiene citas futuras ni slots bloqueados. También desactiva el usuario, horarios y bloquea sus slots futuros.',
  })
  async deactivate(
    @Param('id') id: string,
  ): Promise<ResponseDto<DoctorResponseDto>> {
    const result = await this.doctorsService.deactivateDoctor(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Doctor desactivado exitosamente',
      data: result,
    };
  }

  // @Delete(':id')
  // @ApiOperation({
  //   summary: 'Eliminar doctor',
  //   description: 'Elimina un doctor del sistema (soft delete)',
  // })
  // @ApiParam({
  //   name: 'id',
  //   description: 'ID único del doctor',
  //   example: 'uuid-here',
  // })
  // @ApiOkResponse({
  //   description: 'Doctor eliminado exitosamente',
  //   type: ResponseDto<DoctorResponseDto>,
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: 'Doctor no encontrado',
  // })
  // async remove(
  //   @Param('id') id: string,
  // ): Promise<ResponseDto<DoctorResponseDto>> {
  //   const doctorDeleted = await this.doctorsService.deleteDoctor(id);
  //   return {
  //     statusCode: HttpStatus.OK,
  //     message: 'Doctor deleted successfully',
  //     data: doctorDeleted,
  //   };
  // }

  // @Get(':id/schedules')
  // async getDoctorSchedules(@Param('id') id: string) {
  //   return this.schedulesService.getDoctorSchedules(id);
  // }

  // @Patch(':id/schedules')
  // async updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
  //   return this.schedulesService.updateSchedule(id, dto);
  // }
}
