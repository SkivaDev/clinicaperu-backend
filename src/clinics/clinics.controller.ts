import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ClinicsService } from './clinics.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import {
  CanDeactivateClinicResponseDto,
  ClinicResponseDto,
} from './dto/clinic-response.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { QueryClinicDto } from './dto/query-clinic.dto';
import { ClinicDeactivateGuard } from './guards/clinic-deactivate.guard';

@ApiTags('Gestión de Clínicas')
@ApiBearerAuth('bearerAuth')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'Token JWT inválido o expirado' })
@ApiForbiddenResponse({
  description: 'Acceso denegado - Se requiere rol de ADMIN',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/clinics')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva clínica' })
  @ApiBody({ type: CreateClinicDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Clínica creada' })
  async create(
    @Body() dto: CreateClinicDto,
  ): Promise<ResponseDto<ClinicResponseDto>> {
    const clinic = await this.clinicsService.createClinic(dto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Clínica creada exitosamente',
      data: clinic,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar clínicas con filtros y paginación' })
  @ApiOkResponse({
    description: 'Clínicas listadas exitosamente',
    type: ResponseDto,
  })
  async findAll(
    @Query() query: QueryClinicDto,
  ): Promise<ResponseDto<ClinicResponseDto[]>> {
    const result = await this.clinicsService.listClinics(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Clínicas obtenidas exitosamente',
      data: result.data,
      stats: result.stats,
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener clínica por ID' })
  @ApiParam({ name: 'id', description: 'ID de la clínica' })
  @ApiOkResponse({ type: ClinicResponseDto })
  async findOne(
    @Param('id') id: string,
  ): Promise<ResponseDto<ClinicResponseDto>> {
    const clinic = await this.clinicsService.getClinicById(id);
    const clinicStats = await this.clinicsService.getClinicStats(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Clínica obtenida exitosamente',
      data: clinic,
      stats: clinicStats,
    };
  }

  @Patch(':id')
  @UseGuards(ClinicDeactivateGuard)
  @ApiOperation({ summary: 'Actualizar clínica' })
  @ApiBody({ type: UpdateClinicDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClinicDto,
  ): Promise<ResponseDto<ClinicResponseDto>> {
    const clinic = await this.clinicsService.updateClinic(id, dto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Clínica actualizada exitosamente',
      data: clinic,
    };
  }

  @Get(':id/can-deactivate')
  @ApiOperation({ summary: 'Validar si la clínica puede desactivarse' })
  async canDeactivate(
    @Param('id') id: string,
  ): Promise<ResponseDto<CanDeactivateClinicResponseDto>> {
    const validation = await this.clinicsService.canDeactivateClinic(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Validación completada',
      data: validation,
    };
  }

  @Patch(':id/deactivate')
  @UseGuards(ClinicDeactivateGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar clínica' })
  async deactivate(
    @Param('id') id: string,
  ): Promise<ResponseDto<ClinicResponseDto>> {
    const clinic = await this.clinicsService.deactivateClinic(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Clínica desactivada exitosamente',
      data: clinic,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deletedClinic = await this.clinicsService.deleteClinic(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Clínica desactivada exitosamente',
      data: deletedClinic,
    };
  }
}
