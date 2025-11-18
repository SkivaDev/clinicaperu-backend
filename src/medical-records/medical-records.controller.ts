import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MedicalRecordsService } from './medical-records.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import type { CurrentUserPayload } from '../auth/types/current-user.interface';
import {
  CreateMedicalRecordDto,
  MedicalHistoryQueryDto,
  UploadAttachmentDto,
  ConfirmAttachmentDto,
  MedicalRecordResponseDto,
  MedicalRecordListResponseDto,
  UploadUrlResponseDto,
  AttachmentConfirmedResponseDto,
  DownloadUrlResponseDto,
} from './dto';

@ApiTags('Medical Records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @Roles('DOCTOR')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear expediente médico',
    description:
      'Crea un expediente médico para una cita atendida. Solo el doctor que atendió la cita puede crear el expediente.',
  })
  @ApiResponse({
    status: 201,
    description: 'Expediente creado exitosamente',
    type: MedicalRecordResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'Cita no pertenece al doctor' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe expediente para esta cita',
  })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateMedicalRecordDto,
  ): Promise<MedicalRecordResponseDto> {
    return this.medicalRecordsService.create(user.userId, dto);
  }

  @Get('my-history')
  @Roles('PATIENT')
  @ApiOperation({
    summary: 'Obtener historial médico del paciente',
    description:
      'Retorna todos los expedientes médicos del paciente autenticado con paginación y filtros.',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial médico obtenido',
    type: MedicalRecordListResponseDto,
  })
  async getMyHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: MedicalHistoryQueryDto,
  ): Promise<MedicalRecordListResponseDto> {
    return this.medicalRecordsService.findAllByPatient(user.userId, query);
  }

  @Get('patient/:patientId')
  @Roles('DOCTOR')
  @ApiOperation({
    summary: 'Obtener expedientes de un paciente',
    description:
      'Retorna los expedientes que el doctor creó para un paciente específico. Requiere relación previa.',
  })
  @ApiParam({ name: 'patientId', description: 'ID del paciente' })
  @ApiResponse({
    status: 200,
    description: 'Expedientes obtenidos',
    type: MedicalRecordListResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Sin relación con el paciente' })
  async getPatientRecords(
    @CurrentUser() user: CurrentUserPayload,
    @Param('patientId') patientId: string,
    @Query() query: MedicalHistoryQueryDto,
  ): Promise<MedicalRecordListResponseDto> {
    return this.medicalRecordsService.findAllByDoctorForPatient(
      user.userId,
      patientId,
      query,
    );
  }

  @Get(':id')
  @Roles('DOCTOR', 'PATIENT')
  @ApiOperation({
    summary: 'Obtener detalle de expediente médico',
    description:
      'Retorna el detalle completo de un expediente. Pacientes solo ven sus propios expedientes, doctores ven expedientes de pacientes que atendieron.',
  })
  @ApiParam({ name: 'id', description: 'ID del expediente' })
  @ApiResponse({
    status: 200,
    description: 'Expediente obtenido',
    type: MedicalRecordResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Sin acceso al expediente' })
  @ApiResponse({ status: 404, description: 'Expediente no encontrado' })
  async getOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<MedicalRecordResponseDto> {
    return this.medicalRecordsService.findOne(id, user.userId, user.role);
  }

  @Post(':id/attachments/upload-url')
  @Roles('DOCTOR')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generar URL para subir archivo adjunto',
    description:
      'Genera una URL prefirmada de S3 para subir un archivo adjunto al expediente. Solo el doctor creador puede subir archivos.',
  })
  @ApiParam({ name: 'id', description: 'ID del expediente' })
  @ApiResponse({
    status: 200,
    description: 'URL generada',
    type: UploadUrlResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Solo el creador puede subir archivos',
  })
  @ApiResponse({ status: 404, description: 'Expediente no encontrado' })
  async generateUploadUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UploadAttachmentDto,
  ): Promise<UploadUrlResponseDto> {
    return this.medicalRecordsService.generateUploadUrl(id, user.userId, dto);
  }

  @Post(':id/attachments/confirm')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirmar archivo subido',
    description:
      'Confirma que un archivo fue subido exitosamente a S3 y lo agrega al registro del expediente.',
  })
  @ApiParam({ name: 'id', description: 'ID del expediente' })
  @ApiResponse({
    status: 200,
    description: 'Archivo confirmado',
    type: AttachmentConfirmedResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Solo el creador puede confirmar archivos',
  })
  @ApiResponse({ status: 404, description: 'Expediente no encontrado' })
  async confirmAttachment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ConfirmAttachmentDto,
  ): Promise<AttachmentConfirmedResponseDto> {
    return this.medicalRecordsService.confirmAttachment(id, user.userId, dto);
  }

  @Get(':id/download')
  @Roles('DOCTOR', 'PATIENT')
  @ApiOperation({
    summary: 'Generar URL para descargar archivo adjunto',
    description:
      'Genera una URL prefirmada de S3 para descargar un archivo adjunto del expediente.',
  })
  @ApiParam({ name: 'id', description: 'ID del expediente' })
  @ApiQuery({ name: 'key', description: 'Key de S3 del archivo' })
  @ApiResponse({
    status: 200,
    description: 'URL generada',
    type: DownloadUrlResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Sin acceso al expediente' })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  async generateDownloadUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Query('key') key: string,
  ): Promise<DownloadUrlResponseDto> {
    return this.medicalRecordsService.generateDownloadUrl(
      id,
      user.userId,
      user.role,
      key,
    );
  }
}
