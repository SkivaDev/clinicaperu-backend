import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import type { CurrentUserPayload } from 'src/auth/types/current-user.interface';
import { Role } from '@prisma/client';
import { ResponseDto } from 'src/common/dto/response.dto';
import {
  MyDoctorDto,
  AdminPatientListDto,
  AdminPatientDetailDto,
  CreatePatientDto,
  UpdatePatientDto,
  CanDeactivatePatientResponseDto,
} from './dto';
import { PatientsDeactivateGuard } from './guards/patient-deactivate.guard';

@ApiTags('patients')
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /**
   * HU-027: GET /patients/my-doctors
   * Retorna la lista de doctores que han atendido al paciente autenticado
   * Solo accesible para pacientes
   */
  @Get('my-doctors')
  @Roles(Role.PATIENT)
  @ApiOperation({
    summary: 'Obtener mis doctores',
    description:
      'Retorna la lista de doctores que han atendido al paciente autenticado, ordenados por fecha de última cita (más reciente primero). Solo incluye doctores activos con citas confirmadas o atendidas.',
  })
  @ApiOkResponse({
    description: 'Lista de doctores obtenida exitosamente',
    type: ResponseDto<MyDoctorDto[]>,
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
  })
  @ApiForbiddenResponse({
    description: 'No tiene permisos (requiere rol PATIENT)',
  })
  async getMyDoctors(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<MyDoctorDto[]>> {
    const doctors = await this.patientsService.getMyDoctors(user.userId);

    return {
      statusCode: HttpStatus.OK,
      message: `Found ${doctors.length} doctor(s)`,
      data: doctors,
    };
  }

  /**
   * ADMIN: GET /patients/admin/all
   * Obtiene la lista de todos los pacientes con estadísticas
   * Solo accesible para administradores
   */
  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener todos los pacientes (Admin)',
    description:
      'Retorna la lista completa de pacientes con estadísticas de citas. Solo accesible para administradores.',
  })
  @ApiOkResponse({
    description: 'Lista de pacientes obtenida exitosamente',
    type: ResponseDto<AdminPatientListDto[]>,
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
  })
  @ApiForbiddenResponse({
    description: 'No tiene permisos (requiere rol ADMIN)',
  })
  async getAllPatients(): Promise<ResponseDto<AdminPatientListDto[]>> {
    const patients = await this.patientsService.getAllPatients();

    return {
      statusCode: HttpStatus.OK,
      message: `Found ${patients.length} patient(s)`,
      data: patients,
    };
  }

  /**
   * ADMIN: GET /patients/admin/:id
   * Obtiene el detalle completo de un paciente
   * Solo accesible para administradores
   */
  @Get('admin/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener detalle de paciente (Admin)',
    description:
      'Retorna el detalle completo de un paciente incluyendo estadísticas y lista de citas. Solo accesible para administradores.',
  })
  @ApiOkResponse({
    description: 'Detalle del paciente obtenido exitosamente',
    type: ResponseDto<AdminPatientDetailDto>,
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
  })
  @ApiForbiddenResponse({
    description: 'No tiene permisos (requiere rol ADMIN)',
  })
  async getPatientById(
    @Param('id') id: string,
  ): Promise<ResponseDto<AdminPatientDetailDto>> {
    const patient = await this.patientsService.getPatientById(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Patient found successfully',
      data: patient,
    };
  }

  /**
   * ADMIN: GET /patients/admin/:id/can-deactivate
   * Valida si un paciente puede ser desactivado
   */
  @Get('admin/:id/can-deactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Validar si el paciente puede desactivarse (Admin)',
    description:
      'Retorna el resultado de la validación para desactivar un paciente. Solo accesible para administradores.',
  })
  @ApiOkResponse({
    description: 'Validación completada exitosamente',
    type: ResponseDto<CanDeactivatePatientResponseDto>,
  })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @ApiForbiddenResponse({
    description: 'No tiene permisos (requiere rol ADMIN)',
  })
  async canDeactivatePatient(
    @Param('id') id: string,
  ): Promise<ResponseDto<CanDeactivatePatientResponseDto>> {
    const validation = await this.patientsService.canDeactivatePatient(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Validación completada',
      data: validation,
    };
  }

  /**
   * ADMIN: PATCH /patients/admin/:id/deactivate
   * Desactiva un paciente explícitamente
   */
  @Patch('admin/:id/deactivate')
  @Roles(Role.ADMIN)
  @UseGuards(PatientsDeactivateGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactivar paciente (Admin)',
    description:
      'Desactiva un paciente solo si cumple con las validaciones requeridas.',
  })
  @ApiOkResponse({
    description: 'Paciente desactivado exitosamente',
    type: ResponseDto<AdminPatientDetailDto>,
  })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @ApiForbiddenResponse({
    description: 'No tiene permisos (requiere rol ADMIN)',
  })
  async deactivatePatient(
    @Param('id') id: string,
  ): Promise<ResponseDto<AdminPatientDetailDto>> {
    const patient = await this.patientsService.deactivatePatient(id);

    return {
      statusCode: HttpStatus.OK,
      message: 'Patient deactivated successfully',
      data: patient,
    };
  }

  /**
   * ADMIN: POST /patients/admin
   * Crea un nuevo paciente
   * Solo accesible para administradores
   */
  @Post('admin')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Crear nuevo paciente (Admin)',
    description:
      'Crea un nuevo paciente en el sistema. Solo accesible para administradores.',
  })
  @ApiOkResponse({
    description: 'Paciente creado exitosamente',
    type: ResponseDto<AdminPatientDetailDto>,
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
  })
  @ApiForbiddenResponse({
    description: 'No tiene permisos (requiere rol ADMIN)',
  })
  async createPatient(
    @Body() dto: CreatePatientDto,
  ): Promise<ResponseDto<AdminPatientDetailDto>> {
    const patient = await this.patientsService.createPatient(dto);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Patient created successfully',
      data: patient,
    };
  }

  /**
   * ADMIN: PUT /patients/admin/:id
   * Actualiza un paciente existente
   * Solo accesible para administradores
   */
  @Put('admin/:id')
  @Roles(Role.ADMIN)
  @UseGuards(PatientsDeactivateGuard)
  @ApiOperation({
    summary: 'Actualizar paciente (Admin)',
    description:
      'Actualiza la información de un paciente existente. Solo accesible para administradores.',
  })
  @ApiOkResponse({
    description: 'Paciente actualizado exitosamente',
    type: ResponseDto<AdminPatientDetailDto>,
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
  })
  @ApiForbiddenResponse({
    description: 'No tiene permisos (requiere rol ADMIN)',
  })
  async updatePatient(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ): Promise<ResponseDto<AdminPatientDetailDto>> {
    const patient = await this.patientsService.updatePatient(id, dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Patient updated successfully',
      data: patient,
    };
  }

  /**
   * ADMIN: DELETE /patients/admin/:id
   * Desactiva un paciente
   * Solo accesible para administradores
   */
  @Delete('admin/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Desactivar paciente (Admin)',
    description:
      'Desactiva un paciente en el sistema (soft delete). Solo accesible para administradores.',
  })
  @ApiOkResponse({
    description: 'Paciente desactivado exitosamente',
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
  })
  @ApiForbiddenResponse({
    description: 'No tiene permisos (requiere rol ADMIN)',
  })
  async deletePatient(
    @Param('id') id: string,
  ): Promise<ResponseDto<{ message: string }>> {
    const result = await this.patientsService.deletePatient(id);

    return {
      statusCode: HttpStatus.OK,
      message: result.message,
      data: result,
    };
  }
}
