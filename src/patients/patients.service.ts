import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MyDoctorDto } from './dto/my-doctor.dto';
import {
  AdminPatientListDto,
  AdminPatientDetailDto,
  CreatePatientDto,
  UpdatePatientDto,
  PatientAppointmentDto,
} from './dto';
import { HashingService } from 'src/common/hashing/hashing.service';
import { S3Service } from 'src/common/s3/s3.service';
import { Role } from '@prisma/client';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * HU-027: Obtiene la lista de doctores que han atendido al paciente
   * Query optimizada con una sola consulta usando agregaciones
   * Retorna solo doctores activos con citas confirmadas o atendidas
   * Ordenados por fecha de última cita (más reciente primero)
   */
  async getMyDoctors(patientId: string): Promise<MyDoctorDto[]> {
    const startTime = Date.now();
    this.logger.log(`Fetching doctors for patient: ${patientId}`);

    // Query optimizada: una sola consulta con JOINs y agregaciones
    // Evita N+1 queries y calcula estadísticas en la misma consulta
    const doctors = await this.prisma.$queryRaw<
      Array<{
        doctorId: string;
        firstName: string;
        lastName: string;
        profileImage: string | null;
        cmp: number;
        rating: number;
        yearsOfExperience: number | null;
        consultationPrice: number | null;
        specialtyName: string;
        clinicName: string;
        totalAppointments: bigint;
        attendedAppointments: bigint;
        lastAppointmentDate: Date;
      }>
    >`
      SELECT 
        d.id as "doctorId",
        u."firstName",
        u."lastName",
        u."profileImage",
        d.cmp,
        d.rating,
        d."yearsOfExperience",
        d."consultationPrice",
        s.name as "specialtyName",
        c.name as "clinicName",
        COUNT(a.id) as "totalAppointments",
        COUNT(CASE WHEN a.status = 'ATTENDED' THEN 1 END) as "attendedAppointments",
        MAX(sl."startAt") as "lastAppointmentDate"
      FROM "Doctor" d
      INNER JOIN "User" u ON d."userId" = u.id
      INNER JOIN "Specialty" s ON d."specialtyId" = s.id
      INNER JOIN "Clinic" c ON d."clinicId" = c.id
      INNER JOIN "Appointment" a ON d.id = a."doctorId"
      INNER JOIN "Slot" sl ON a."slotId" = sl.id
      WHERE a."userId" = ${patientId}
        AND a.status IN ('CONFIRMED', 'ATTENDED')
        AND d."isActive" = true
      GROUP BY 
        d.id, 
        u."firstName", 
        u."lastName", 
        u."profileImage",
        d.cmp,
        d.rating,
        d."yearsOfExperience",
        d."consultationPrice",
        s.name,
        c.name
      ORDER BY "lastAppointmentDate" DESC
    `;

    const duration = Date.now() - startTime;
    this.logger.log(
      `Query completed in ${duration}ms. Found ${doctors.length} doctor(s)`,
    );

    // Transformar resultado a DTO con URLs de S3
    const result: MyDoctorDto[] = await Promise.all(
      doctors.map(async (doc) => {
        const profileImageUrl = await this.generateProfileImageUrl(
          doc.profileImage,
        );
        return {
          doctorId: doc.doctorId,
          firstName: doc.firstName,
          lastName: doc.lastName,
          fullName: `${doc.firstName} ${doc.lastName}`,
          profileImage: profileImageUrl,
          cmp: doc.cmp,
          rating: doc.rating,
          yearsOfExperience: doc.yearsOfExperience,
          consultationPrice: doc.consultationPrice,
          specialty: doc.specialtyName,
          clinic: doc.clinicName,
          statistics: {
            totalAppointments: Number(doc.totalAppointments),
            attendedAppointments: Number(doc.attendedAppointments),
            lastAppointmentDate: doc.lastAppointmentDate,
          },
        };
      }),
    );

    return result;
  }

  /**
   * ADMIN: Obtiene la lista de todos los pacientes con estadísticas
   * Incluye información básica y estadísticas de citas
   */
  async getAllPatients(): Promise<AdminPatientListDto[]> {
    const startTime = Date.now();
    this.logger.log('Fetching all patients for admin');

    // Query optimizada con agregaciones
    const patients = await this.prisma.$queryRaw<
      Array<{
        id: string;
        dni: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
        gender: string;
        dayOfBirth: Date;
        profileImage: string | null;
        role: string;
        isActive: boolean;
        createdAt: Date;
        totalAppointments: bigint;
        confirmedAppointments: bigint;
        attendedAppointments: bigint;
        cancelledAppointments: bigint;
        lastAppointmentDate: Date | null;
      }>
    >`
      SELECT 
        u.id,
        u.dni,
        u."firstName",
        u."lastName",
        u.email,
        u.phone,
        u.gender,
        u."dayOfBirth",
        u."profileImage",
        u.role,
        u."isActive",
        u."createdAt",
        COUNT(a.id) as "totalAppointments",
        COUNT(CASE WHEN a.status = 'CONFIRMED' THEN 1 END) as "confirmedAppointments",
        COUNT(CASE WHEN a.status = 'ATTENDED' THEN 1 END) as "attendedAppointments",
        COUNT(CASE WHEN a.status = 'CANCELLED' THEN 1 END) as "cancelledAppointments",
        MAX(sl."startAt") as "lastAppointmentDate"
      FROM "User" u
      LEFT JOIN "Appointment" a ON u.id = a."userId"
      LEFT JOIN "Slot" sl ON a."slotId" = sl.id
      WHERE u.role = 'PATIENT'
      GROUP BY u.id
      ORDER BY u."createdAt" DESC
    `;

    const duration = Date.now() - startTime;
    this.logger.log(
      `Query completed in ${duration}ms. Found ${patients.length} patient(s)`,
    );

    // Calcular edad y transformar a DTO con URLs de S3
    const result: AdminPatientListDto[] = await Promise.all(
      patients.map(async (patient) => {
        const age = this.calculateAge(patient.dayOfBirth);
        const profileImageUrl = await this.generateProfileImageUrl(
          patient.profileImage,
        );
        return {
          id: patient.id,
          dni: patient.dni,
          firstName: patient.firstName,
          lastName: patient.lastName,
          fullName: `${patient.firstName} ${patient.lastName}`,
          email: patient.email,
          phone: patient.phone,
          gender: patient.gender as any,
          dayOfBirth: patient.dayOfBirth,
          age,
          profileImage: profileImageUrl,
          role: patient.role as any,
          isActive: patient.isActive,
          createdAt: patient.createdAt,
          statistics: {
            totalAppointments: Number(patient.totalAppointments),
            confirmedAppointments: Number(patient.confirmedAppointments),
            attendedAppointments: Number(patient.attendedAppointments),
            cancelledAppointments: Number(patient.cancelledAppointments),
            lastAppointmentDate: patient.lastAppointmentDate,
          },
        };
      }),
    );

    return result;
  }

  /**
   * ADMIN: Obtiene el detalle completo de un paciente
   * Incluye estadísticas detalladas y lista de citas
   */
  async getPatientById(patientId: string): Promise<AdminPatientDetailDto> {
    this.logger.log(`Fetching patient detail: ${patientId}`);

    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      include: {
        appointments: {
          include: {
            slot: true,
            doctor: {
              include: {
                user: true,
                specialty: true,
                clinic: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    if (patient.role !== Role.PATIENT) {
      throw new NotFoundException(
        `User with ID ${patientId} is not a patient`,
      );
    }

    // Calcular estadísticas
    const statistics = {
      totalAppointments: patient.appointments.length,
      confirmedAppointments: patient.appointments.filter(
        (a) => a.status === 'CONFIRMED',
      ).length,
      attendedAppointments: patient.appointments.filter(
        (a) => a.status === 'ATTENDED',
      ).length,
      cancelledAppointments: patient.appointments.filter(
        (a) => a.status === 'CANCELLED',
      ).length,
      pendingAppointments: patient.appointments.filter(
        (a) => a.status === 'PENDING',
      ).length,
      noShowAppointments: patient.appointments.filter(
        (a) => a.status === 'NO_SHOW',
      ).length,
    };

    // Mapear citas
    const appointments: PatientAppointmentDto[] = patient.appointments.map(
      (appointment) => ({
        id: appointment.id,
        status: appointment.status,
        startAt: appointment.slot.startAt,
        endAt: appointment.slot.endAt,
        reason: appointment.reason,
        doctorName: `${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`,
        specialty: appointment.doctor.specialty.name,
        clinic: appointment.doctor.clinic.name,
        createdAt: appointment.createdAt,
      }),
    );

    const age = this.calculateAge(patient.dayOfBirth);
    const profileImageUrl = await this.generateProfileImageUrl(
      patient.profileImage,
    );

    return {
      id: patient.id,
      dni: patient.dni,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone,
      gender: patient.gender,
      dayOfBirth: patient.dayOfBirth,
      age,
      profileImage: profileImageUrl,
      role: patient.role,
      isActive: patient.isActive,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
      statistics,
      appointments,
    };
  }

  /**
   * ADMIN: Crea un nuevo paciente
   */
  async createPatient(dto: CreatePatientDto): Promise<AdminPatientDetailDto> {
    this.logger.log(`Creating new patient with DNI: ${dto.dni}`);

    // Verificar si el DNI ya existe
    const existingDni = await this.prisma.user.findUnique({
      where: { dni: dto.dni },
    });

    if (existingDni) {
      throw new ConflictException(`DNI ${dto.dni} is already registered`);
    }

    // Verificar si el email ya existe
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException(`Email ${dto.email} is already registered`);
    }

    // Hash de la contraseña
    const passwordHash = await this.hashingService.hash(dto.password);

    // Crear usuario
    const patient = await this.prisma.user.create({
      data: {
        dni: dto.dni,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dayOfBirth: new Date(dto.dayOfBirth),
        phone: dto.phone,
        gender: dto.gender,
        profileImage: dto.profileImage,
        role: Role.PATIENT,
      },
    });

    this.logger.log(`Patient created successfully: ${patient.id}`);

    // Retornar detalle del paciente
    return this.getPatientById(patient.id);
  }

  /**
   * ADMIN: Actualiza un paciente existente
   */
  async updatePatient(
    patientId: string,
    dto: UpdatePatientDto,
  ): Promise<AdminPatientDetailDto> {
    this.logger.log(`Updating patient: ${patientId}`);

    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    if (patient.role !== Role.PATIENT) {
      throw new NotFoundException(
        `User with ID ${patientId} is not a patient`,
      );
    }

    // Verificar email único si se está cambiando
    if (dto.email && dto.email !== patient.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingEmail) {
        throw new ConflictException(`Email ${dto.email} is already in use`);
      }
    }

    // Actualizar paciente
    await this.prisma.user.update({
      where: { id: patientId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        gender: dto.gender,
        dayOfBirth: dto.dayOfBirth ? new Date(dto.dayOfBirth) : undefined,
        profileImage: dto.profileImage,
        isActive: dto.isActive,
      },
    });

    this.logger.log(`Patient updated successfully: ${patientId}`);

    // Retornar detalle actualizado
    return this.getPatientById(patientId);
  }

  /**
   * ADMIN: Elimina (desactiva) un paciente
   */
  async deletePatient(patientId: string): Promise<{ message: string }> {
    this.logger.log(`Deleting patient: ${patientId}`);

    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    if (patient.role !== Role.PATIENT) {
      throw new NotFoundException(
        `User with ID ${patientId} is not a patient`,
      );
    }

    // Desactivar en lugar de eliminar (soft delete)
    await this.prisma.user.update({
      where: { id: patientId },
      data: { isActive: false },
    });

    this.logger.log(`Patient deactivated successfully: ${patientId}`);

    return { message: 'Patient deactivated successfully' };
  }

  /**
   * Helper: Genera URL prefirmada de S3 para profileImage
   * Si la imagen no existe o falla, retorna null
   */
  private async generateProfileImageUrl(
    profileImage: string | null,
  ): Promise<string | null> {
    if (!profileImage) {
      return null;
    }

    try {
      // Generar URL prefirmada con expiración de 1 hora (3600 segundos)
      const signedUrl = await this.s3Service.generateDownloadUrl(
        profileImage,
        3600,
      );
      return signedUrl;
    } catch {
      // Si falla, retornar null (la imagen no se mostrará)
      return null;
    }
  }

  /**
   * Utilidad: Calcula la edad a partir de la fecha de nacimiento
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  }
}
