import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  HttpStatus,
  Query,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SpecialtiesService } from './specialties.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { QuerySpecialtyDto } from './dto/query-specialty.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ResponseDto } from '../common/dto/response.dto';
// import { ResponseDto } from './dto/response.dto'; //TODO: Este ReponseDto es temporan, porque otros endpoints no soportan esta ultima version
import {
  SpecialtyResponseDto,
  CanDeactivateResponseDto,
} from './dto/specialty-response.dto';
import { SpecialtyDeactivateGuard } from './guards/specialty-deactivate.guard';

@ApiTags('Admin - Specialties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/specialties')
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva especialidad' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Especialidad creada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Ya existe una especialidad con ese nombre',
  })
  async create(
    @Body() createSpecialtyDto: CreateSpecialtyDto,
  ): Promise<ResponseDto<SpecialtyResponseDto>> {
    const createdSpecialty =
      await this.specialtiesService.createSpecialty(createSpecialtyDto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Especialidad creada exitosamente',
      data: createdSpecialty,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las especialidades con paginación' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de especialidades obtenida exitosamente',
  })
  async findAll(
    @Query() query: QuerySpecialtyDto,
  ): Promise<ResponseDto<SpecialtyResponseDto[]>> {
    const result = await this.specialtiesService.listSpecialties(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Especialidades obtenidas exitosamente',
      data: result.data,
      stats: result.stats,
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener especialidad por ID' })
  @ApiParam({ name: 'id', description: 'ID de la especialidad' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Especialidad encontrada',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Especialidad no encontrada',
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<ResponseDto<SpecialtyResponseDto>> {
    const specialty = await this.specialtiesService.getSpecialtyById(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Especialidad encontrada exitosamente',
      data: specialty,
    };
  }

  @Patch(':id')
  @UseGuards(SpecialtyDeactivateGuard)
  @ApiOperation({
    summary: 'Actualizar especialidad (incluyendo activación/desactivación)',
  })
  @ApiParam({ name: 'id', description: 'ID de la especialidad' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Especialidad actualizada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      'No se puede desactivar la especialidad (tiene doctores activos o citas futuras)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Especialidad no encontrada',
  })
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
      message: 'Especialidad actualizada exitosamente',
      data: updatedSpecialty,
    };
  }

  // @Delete(':id')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({
  //   summary:
  //     'Eliminar especialidad (solo si no tiene doctores ni citas asociadas)',
  // })
  // @ApiParam({ name: 'id', description: 'ID de la especialidad' })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Especialidad eliminada exitosamente',
  // })
  // @ApiResponse({
  //   status: HttpStatus.FORBIDDEN,
  //   description: 'No se puede eliminar (tiene dependencias)',
  // })
  // @ApiResponse({
  //   status: HttpStatus.NOT_FOUND,
  //   description: 'Especialidad no encontrada',
  // })
  // async remove(
  //   @Param('id') id: string,
  // ): Promise<ResponseDto<SpecialtyResponseDto>> {
  //   const deletedSpecialty = await this.specialtiesService.removeSpecialty(id);

  //   return {
  //     statusCode: HttpStatus.OK,
  //     message: 'Especialidad eliminada exitosamente',
  //     data: deletedSpecialty,
  //   };
  // }

  @Get(':id/can-deactivate')
  @ApiOperation({
    summary:
      'Verificar si una especialidad puede ser desactivada (para validación en UI)',
  })
  @ApiParam({ name: 'id', description: 'ID de la especialidad' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Información de validación obtenida',
  })
  async canDeactivate(
    @Param('id') id: string,
  ): Promise<ResponseDto<CanDeactivateResponseDto>> {
    const validation = await this.specialtiesService.canDeactivate(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Validación completada',
      data: validation,
    };
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactivar especialidad con validación de dependencias',
    description:
      'Desactiva una especialidad solo si no tiene doctores activos ni citas futuras programadas',
  })
  @ApiParam({ name: 'id', description: 'ID de la especialidad a desactivar' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Especialidad desactivada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      'No se puede desactivar (tiene doctores activos o citas futuras)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Especialidad no encontrada',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'La especialidad ya está desactivada',
  })
  async deactivate(
    @Param('id') id: string,
  ): Promise<ResponseDto<SpecialtyResponseDto>> {
    const deactivatedSpecialty =
      await this.specialtiesService.deactivateSpecialty(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Especialidad desactivada exitosamente',
      data: deactivatedSpecialty,
    };
  }
}
