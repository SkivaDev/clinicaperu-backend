import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../common/s3/s3.service';
import { MedicalRecordAccessService } from './medical-record-access.service';
import {
  CreateMedicalRecordDto,
  MedicalHistoryQueryDto,
  UploadAttachmentDto,
  ConfirmAttachmentDto,
  MedicalRecordResponseDto,
  MedicalRecordListResponseDto,
} from './dto';
import { v4 as uuidv4 } from 'uuid';
import { RecordType } from '@prisma/client';

// Tipo para queries de Prisma
interface MedicalRecordWhere {
  createdById?: string;
  appointment?: { userId: string };
  recordType?: RecordType;
  recordDate?: {
    gte?: Date;
    lte?: Date;
  };
}

@Injectable()
export class MedicalRecordsService {
  private readonly logger = new Logger(MedicalRecordsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly accessService: MedicalRecordAccessService,
  ) {}

  /**
   * Crear un nuevo expediente médico
   */
  async create(
    doctorUserId: string,
    dto: CreateMedicalRecordDto,
  ): Promise<MedicalRecordResponseDto> {
    const logContext = `[CreateMedicalRecord]`;

    // Obtener doctorId desde userId
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: doctorUserId },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Perfil de doctor no encontrado');
    }

    // Validar que la cita existe y pertenece al doctor
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: {
        user: true,
        doctor: {
          include: {
            user: true,
            specialty: true,
          },
        },
        slot: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    if (appointment.doctorId !== doctor.id) {
      throw new ForbiddenException('Esta cita no te pertenece');
    }

    if (appointment.status !== 'ATTENDED') {
      throw new BadRequestException(
        'Solo se puede crear expediente de citas atendidas',
      );
    }

    // Validar que no existe expediente previo
    const existingRecord = await this.prisma.medicalRecord.findUnique({
      where: { appointmentId: dto.appointmentId },
    });

    if (existingRecord) {
      throw new ConflictException('Ya existe un expediente para esta cita');
    }

    // Crear expediente médico
    const record = await this.prisma.medicalRecord.create({
      data: {
        appointmentId: dto.appointmentId,
        recordType: dto.recordType,
        diagnosis: dto.diagnosis,
        prescription: dto.prescription,
        notes: dto.notes,
        vitalSigns: dto.vitalSigns as any,
        attachments: [],
        createdById: appointment.doctor.userId,
      },
      include: {
        appointment: {
          include: {
            slot: true,
          },
        },
        createdBy: {
          include: {
            doctor: {
              include: {
                specialty: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `${logContext} Record created: ${record.id} for appointment ${dto.appointmentId}`,
    );

    // Registrar acceso
    await this.accessService.logAccess(
      record.id,
      appointment.doctor.userId,
      'CREATE',
    );

    // Encolar email al paciente
    await this.enqueueNotificationEmail(
      appointment.user.email,
      appointment.user.firstName,
      appointment.user.lastName,
      appointment.doctor.user.firstName,
      appointment.doctor.user.lastName,
      appointment.doctor.specialty.name,
      record.recordDate,
      dto.recordType,
    );

    return this.mapToResponseDto(record);
  }

  /**
   * Obtener historial médico del paciente
   */
  async findAllByPatient(
    patientId: string,
    query: MedicalHistoryQueryDto,
  ): Promise<MedicalRecordListResponseDto> {
    const { page = 1, limit = 10, recordType, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      appointment: {
        userId: patientId,
      },
    };

    if (recordType) {
      where.recordType = recordType;
    }

    if (startDate || endDate) {
      where.recordDate = {};
      if (startDate) {
        where.recordDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.recordDate.lte = new Date(endDate);
      }
    }

    const [records, total] = await Promise.all([
      this.prisma.medicalRecord.findMany({
        where,
        skip,
        take: limit,
        include: {
          appointment: {
            include: {
              slot: true,
            },
          },
          createdBy: {
            include: {
              doctor: {
                include: {
                  specialty: true,
                },
              },
            },
          },
        },
        orderBy: { recordDate: 'desc' },
      }),
      this.prisma.medicalRecord.count({ where }),
    ]);

    // Registrar acceso para cada registro visualizado
    for (const record of records) {
      await this.accessService.logAccess(record.id, patientId, 'VIEW');
    }

    return {
      records: records.map((r) => this.mapToResponseDto(r)),
      total,
      page,
      limit,
    };
  }

  /**
   * Obtener expedientes que el doctor creó de un paciente específico
   */
  async findAllByDoctorForPatient(
    doctorUserId: string,
    patientId: string,
    query: MedicalHistoryQueryDto,
  ): Promise<MedicalRecordListResponseDto> {
    // Obtener doctorId desde userId
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: doctorUserId },
      select: { id: true, userId: true },
    });

    if (!doctor) {
      throw new NotFoundException('Perfil de doctor no encontrado');
    }

    // Validar relación doctor-paciente
    await this.validateDoctorPatientRelation(doctor.id, patientId);

    const { page = 1, limit = 10, recordType, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: MedicalRecordWhere = {
      createdById: doctor.userId,
      appointment: {
        userId: patientId,
      },
    };

    if (recordType) {
      where.recordType = recordType;
    }

    if (startDate || endDate) {
      where.recordDate = {};
      if (startDate) {
        where.recordDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.recordDate.lte = new Date(endDate);
      }
    }

    const [records, total] = await Promise.all([
      this.prisma.medicalRecord.findMany({
        where,
        skip,
        take: limit,
        include: {
          appointment: {
            include: {
              slot: true,
            },
          },
          createdBy: {
            include: {
              doctor: {
                include: {
                  specialty: true,
                },
              },
            },
          },
        },
        orderBy: { recordDate: 'desc' },
      }),
      this.prisma.medicalRecord.count({ where }),
    ]);

    // Registrar acceso
    for (const record of records) {
      await this.accessService.logAccess(record.id, doctor.userId, 'VIEW');
    }

    return {
      records: records.map((r) => this.mapToResponseDto(r)),
      total,
      page,
      limit,
    };
  }

  /**
   * Obtener detalle de un expediente médico
   */
  async findOne(
    recordId: string,
    userId: string,
    userRole: string,
  ): Promise<MedicalRecordResponseDto> {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id: recordId },
      include: {
        appointment: {
          include: {
            slot: true,
            user: true,
          },
        },
        createdBy: {
          include: {
            doctor: {
              include: {
                specialty: true,
              },
            },
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Expediente médico no encontrado');
    }

    // Validar acceso
    if (userRole === 'PATIENT') {
      // El paciente solo puede ver sus propios expedientes
      if (record.appointment.userId !== userId) {
        throw new ForbiddenException('No tienes acceso a este expediente');
      }
    } else if (userRole === 'DOCTOR') {
      // El doctor puede ver expedientes que creó o de pacientes que atendió
      const canAccess =
        record.createdById === userId ||
        (await this.doctorHasAccessToPatient(
          userId,
          record.appointment.userId,
        ));

      if (!canAccess) {
        throw new ForbiddenException('No tienes acceso a este expediente');
      }
    }

    // Registrar acceso
    await this.accessService.logAccess(recordId, userId, 'VIEW');

    return this.mapToResponseDto(record);
  }

  /**
   * Generar URL prefirmada para subir archivo
   */
  async generateUploadUrl(
    recordId: string,
    doctorUserId: string,
    dto: UploadAttachmentDto,
  ) {
    // Validar que el expediente existe y fue creado por este doctor
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException('Expediente médico no encontrado');
    }

    if (record.createdById !== doctorUserId) {
      throw new ForbiddenException(
        'Solo el doctor creador puede subir archivos',
      );
    }

    // Generar key único para el archivo manualmente
    const fileKey = `medical-records/${recordId}/${uuidv4()}-${dto.fileName}`;

    // Usar el método del S3Service con recordId como userId (es solo para el path)
    const { uploadUrl } = await this.s3Service.generateUploadUrl(
      recordId,
      dto.fileName,
      dto.fileType,
      300,
    );

    this.logger.log(`Generated upload URL for record ${recordId}: ${fileKey}`);

    // Retornar con el key correcto que generamos
    return {
      uploadUrl,
      key: fileKey,
      expiresIn: 300,
    };
  }

  /**
   * Confirmar que un archivo fue subido correctamente
   */
  async confirmAttachment(
    recordId: string,
    doctorUserId: string,
    dto: ConfirmAttachmentDto,
  ) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException('Expediente médico no encontrado');
    }

    if (record.createdById !== doctorUserId) {
      throw new ForbiddenException(
        'Solo el doctor creador puede confirmar archivos',
      );
    }

    // Agregar attachment al array
    const attachment = {
      key: dto.key,
      name: dto.name,
      uploadedAt: new Date(),
      size: dto.size,
    };

    const currentAttachments = (record.attachments as any[]) || [];

    await this.prisma.medicalRecord.update({
      where: { id: recordId },
      data: {
        attachments: [...currentAttachments, attachment],
      },
    });

    // Registrar acceso
    await this.accessService.logAccess(recordId, doctorUserId, 'UPLOAD_FILE', {
      fileName: dto.name,
      fileSize: dto.size,
    });

    this.logger.log(
      `File confirmed for record ${recordId}: ${dto.name} (${dto.size} bytes)`,
    );

    return {
      message: 'Archivo agregado exitosamente',
      attachment,
    };
  }

  /**
   * Generar URL prefirmada para descargar archivo
   */
  async generateDownloadUrl(
    recordId: string,
    userId: string,
    userRole: string,
    attachmentKey: string,
  ) {
    // Primero validar que el usuario tiene acceso al expediente
    const record = await this.findOne(recordId, userId, userRole);

    // Validar que el archivo existe en los attachments
    const attachments = (record.attachments as any[]) || [];
    const attachment = attachments.find((a: any) => a.key === attachmentKey);

    if (!attachment) {
      throw new NotFoundException('Archivo no encontrado en este expediente');
    }

    // Generar URL de descarga (15 minutos)
    const downloadUrl = await this.s3Service.generateDownloadUrl(
      attachmentKey,
      900,
    );

    if (!downloadUrl) {
      throw new NotFoundException(
        'No se pudo generar URL de descarga para el archivo',
      );
    }

    // Registrar acceso
    await this.accessService.logAccess(recordId, userId, 'DOWNLOAD_FILE', {
      fileName: attachment.name,
    });

    this.logger.log(
      `Generated download URL for record ${recordId}: ${attachmentKey}`,
    );

    return {
      downloadUrl,
      expiresIn: 900,
    };
  }

  /**
   * Validar que el doctor ha atendido al paciente previamente
   */
  private async validateDoctorPatientRelation(
    doctorId: string,
    patientId: string,
  ): Promise<void> {
    const hasRelation = await this.prisma.appointment.findFirst({
      where: {
        doctorId,
        userId: patientId,
        status: {
          in: ['ATTENDED', 'CONFIRMED'],
        },
      },
    });

    if (!hasRelation) {
      throw new ForbiddenException(
        'No tienes relación previa con este paciente',
      );
    }
  }

  /**
   * Verificar si el doctor tiene acceso al paciente
   */
  private async doctorHasAccessToPatient(
    doctorUserId: string,
    patientId: string,
  ): Promise<boolean> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: doctorUserId },
    });

    if (!doctor) {
      return false;
    }

    const hasRelation = await this.prisma.appointment.findFirst({
      where: {
        doctorId: doctor.id,
        userId: patientId,
        status: {
          in: ['ATTENDED', 'CONFIRMED'],
        },
      },
    });

    return !!hasRelation;
  }

  /**
   * Mapear entidad Prisma a DTO de respuesta
   */
  private mapToResponseDto(record: any): MedicalRecordResponseDto {
    return {
      id: record.id,
      recordDate: record.recordDate,
      recordType: record.recordType,
      diagnosis: record.diagnosis,
      prescription: record.prescription,
      notes: record.notes,
      vitalSigns: record.vitalSigns,
      attachments: record.attachments || [],
      doctor: {
        id: record.createdBy.doctor.id,
        firstName: record.createdBy.firstName,
        lastName: record.createdBy.lastName,
        cmp: record.createdBy.doctor.cmp,
        specialty: record.createdBy.doctor.specialty.name,
      },
      appointment: {
        id: record.appointment.id,
        date: record.appointment.slot.startAt,
      },
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Encolar email de notificación al paciente
   */
  private async enqueueNotificationEmail(
    patientEmail: string,
    patientFirstName: string,
    patientLastName: string,
    doctorFirstName: string,
    doctorLastName: string,
    specialtyName: string,
    recordDate: Date,
    recordType: string,
  ): Promise<void> {
    try {
      await this.prisma.emailMessage.create({
        data: {
          to: patientEmail,
          subject: 'Tu expediente médico está disponible',
          template: 'BOOKING_CONFIRMATION', // Reusando template (TODO: crear MEDICAL_RECORD_AVAILABLE)
          status: 'PENDING',
          variables: {
            patientName: `${patientFirstName} ${patientLastName}`,
            doctorName: `Dr. ${doctorFirstName} ${doctorLastName}`,
            specialty: specialtyName,
            recordDate: recordDate.toISOString(),
            recordType,
            message:
              'Tu expediente médico ya está disponible en tu historial. Puedes verlo en la sección "Mi Historial Médico".',
          },
        },
      });

      this.logger.log(
        `Email enqueued for patient: ${patientEmail} - Medical record available`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue email: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // No lanzamos error para no interrumpir el flujo
    }
  }
}
