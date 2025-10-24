import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UnavailabilityService } from './unavailability.service';
import { CreateUnavailabilityDto } from './dto/create-unavailability.dto';
import { UpdateUnavailabilityDto } from './dto/update-unavailability.dto';
import { UnavailabilityResponseDto } from './dto/unavailability-response.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * Controller for managing doctor unavailability periods
 * Implements HU-020.5 requirements
 */
@ApiTags('doctor-unavailability')
@Controller('doctors/:doctorId/unavailability')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UnavailabilityController {
  constructor(
    private readonly unavailabilityService: UnavailabilityService,
  ) {}

  /**
   * POST /doctors/:doctorId/unavailability
   * Creates a new unavailability period
   * Only ADMIN and DOCTOR can create
   */
  @Post()
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({
    summary: 'Crear período de no disponibilidad',
    description:
      'Crea un nuevo período de no disponibilidad para un doctor. No se puede crear si existen citas confirmadas en el período.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Período de no disponibilidad creado exitosamente',
    type: UnavailabilityResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos inválidos o rango de fechas incorrecto',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Doctor no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Existen citas confirmadas en el período especificado',
  })
  async create(
    @Param('doctorId') doctorId: string,
    @Body() createDto: CreateUnavailabilityDto,
  ): Promise<ResponseDto<UnavailabilityResponseDto>> {
    const unavailability = await this.unavailabilityService.create(
      doctorId,
      createDto,
    );
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Período de no disponibilidad creado exitosamente',
      data: unavailability,
    };
  }

  /**
   * GET /doctors/:doctorId/unavailability
   * Lists all future unavailability periods
   */
  @Get()
  @ApiOperation({
    summary: 'Listar períodos de no disponibilidad futuros',
    description:
      'Obtiene todos los períodos de no disponibilidad futuros o actuales de un doctor.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de períodos de no disponibilidad obtenida exitosamente',
    type: [UnavailabilityResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Doctor no encontrado',
  })
  async findAllFuture(
    @Param('doctorId') doctorId: string,
  ): Promise<ResponseDto<UnavailabilityResponseDto[]>> {
    const unavailabilities =
      await this.unavailabilityService.findAllFuture(doctorId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Períodos de no disponibilidad obtenidos exitosamente',
      data: unavailabilities,
    };
  }

  /**
   * GET /doctors/:doctorId/unavailability/all
   * Lists all unavailability periods (including past)
   */
  @Get('all')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({
    summary: 'Listar todos los períodos de no disponibilidad',
    description:
      'Obtiene todos los períodos de no disponibilidad de un doctor, incluyendo pasados.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista completa de períodos obtenida exitosamente',
    type: [UnavailabilityResponseDto],
  })
  async findAll(
    @Param('doctorId') doctorId: string,
  ): Promise<ResponseDto<UnavailabilityResponseDto[]>> {
    const unavailabilities =
      await this.unavailabilityService.findAll(doctorId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Todos los períodos obtenidos exitosamente',
      data: unavailabilities,
    };
  }

  /**
   * GET /doctors/:doctorId/unavailability/:id
   * Gets a specific unavailability period
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un período de no disponibilidad específico',
    description: 'Obtiene los detalles de un período de no disponibilidad por su ID.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'ID del período de no disponibilidad (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Período encontrado',
    type: UnavailabilityResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Período no encontrado',
  })
  async findOne(
    @Param('doctorId') doctorId: string,
    @Param('id') id: string,
  ): Promise<ResponseDto<UnavailabilityResponseDto>> {
    const unavailability = await this.unavailabilityService.findOne(
      doctorId,
      id,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Período encontrado',
      data: unavailability,
    };
  }

  /**
   * PUT /doctors/:doctorId/unavailability/:id
   * Updates an unavailability period
   * Only ADMIN and DOCTOR can update
   */
  @Put(':id')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({
    summary: 'Actualizar período de no disponibilidad',
    description:
      'Actualiza un período de no disponibilidad. No se puede actualizar si existen citas confirmadas en el nuevo período.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'ID del período de no disponibilidad (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Período actualizado exitosamente',
    type: UnavailabilityResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Período no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Existen citas confirmadas en el nuevo período',
  })
  async update(
    @Param('doctorId') doctorId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateUnavailabilityDto,
  ): Promise<ResponseDto<UnavailabilityResponseDto>> {
    const unavailability = await this.unavailabilityService.update(
      doctorId,
      id,
      updateDto,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Período actualizado exitosamente',
      data: unavailability,
    };
  }

  /**
   * DELETE /doctors/:doctorId/unavailability/:id
   * Deletes an unavailability period
   * Only ADMIN and DOCTOR can delete
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiOperation({
    summary: 'Eliminar período de no disponibilidad',
    description:
      'Elimina un período de no disponibilidad. No se puede eliminar si existen citas confirmadas en el período.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'ID del doctor (UUID)',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'ID del período de no disponibilidad (UUID)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Período eliminado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Período no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Existen citas confirmadas en el período',
  })
  async remove(
    @Param('doctorId') doctorId: string,
    @Param('id') id: string,
  ): Promise<ResponseDto<void>> {
    await this.unavailabilityService.remove(doctorId, id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Período de no disponibilidad eliminado exitosamente',
      data: undefined,
    };
  }
}
