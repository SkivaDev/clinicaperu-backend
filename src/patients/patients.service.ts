import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
import { AppointmentStatus, Gender, Prisma, Role } from '@prisma/client';
import {
  PatientAlreadyExistsException,
  PatientCannotBeDeactivatedException,
  PatientNotFoundException,
} from './exceptions/patient.exceptions';

export interface CanDeactivatePatientResponse {
  canDeactivate: boolean;
  reasons: string[];
  warnings: string[];
  metadata: {
    futureAppointments: number;
  };
}

type NormalizedPatientIdentifiers = {
  dni?: string;
  email?: string;
};

type NormalizedCreatePatientPayload = {
  dni: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  gender: Gender;
  dayOfBirth: Date;
  profileImage: string | null;
  isActive: boolean;
};

type NormalizedUpdatePatientPayload = NormalizedPatientIdentifiers & {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  gender?: Gender;
  dayOfBirth?: Date;
  profileImage?: string | null;
  isActive?: boolean;
};

const MIN_PATIENT_AGE = 18;

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

    // Transformar resultado a DTO sin modificar la URL de profileImage
    const result: MyDoctorDto[] = doctors.map((doc) => ({
      doctorId: doc.doctorId,
      firstName: doc.firstName,
      lastName: doc.lastName,
      fullName: `${doc.firstName} ${doc.lastName}`,
      profileImage: doc.profileImage,
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
    }));

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
        gender: Gender;
        dayOfBirth: Date;
        profileImage: string | null;
        role: Role;
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
        // const profileImageUrl = await this.generateProfileImageUrl(
        //   patient.profileImage,
        // );
        return {
          id: patient.id,
          dni: patient.dni,
          firstName: patient.firstName,
          lastName: patient.lastName,
          fullName: `${patient.firstName} ${patient.lastName}`,
          email: patient.email,
          phone: patient.phone,
          gender: patient.gender,
          dayOfBirth: patient.dayOfBirth,
          age,
          profileImage: patient.profileImage,
          role: patient.role,
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

    if (!patient || patient.role !== Role.PATIENT) {
      throw new PatientNotFoundException(patientId);
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

    const normalized = this.normalizeCreatePayload(dto);

    await this.ensureUniqueIdentifiers({
      dni: normalized.dni,
      email: normalized.email,
    });
    this.validatePatientAge(normalized.dayOfBirth);

    const passwordHash = await this.hashingService.hash(normalized.password);

    const patient = await this.prisma.user.create({
      data: {
        dni: normalized.dni,
        email: normalized.email,
        passwordHash,
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        dayOfBirth: normalized.dayOfBirth,
        phone: normalized.phone,
        gender: normalized.gender,
        profileImage: normalized.profileImage,
        role: Role.PATIENT,
        isActive: normalized.isActive,
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

    const patient = await this.getPatientEntity(patientId);
    const normalized = this.normalizeUpdatePayload(dto);

    const uniqueChecks: { dni?: string; email?: string } = {};
    const updateData: Prisma.UserUpdateInput = {};

    if (normalized.dni !== undefined && normalized.dni !== patient.dni) {
      uniqueChecks.dni = normalized.dni;
      updateData.dni = normalized.dni;
    }

    if (normalized.email !== undefined && normalized.email !== patient.email) {
      uniqueChecks.email = normalized.email;
      updateData.email = normalized.email;
    }

    if (Object.keys(uniqueChecks).length > 0) {
      await this.ensureUniqueIdentifiers(uniqueChecks, {
        excludePatientId: patientId,
      });
    }

    if (normalized.firstName !== undefined) {
      updateData.firstName = normalized.firstName;
    }

    if (normalized.lastName !== undefined) {
      updateData.lastName = normalized.lastName;
    }

    if (normalized.phone !== undefined) {
      updateData.phone = normalized.phone;
    }

    if (normalized.gender !== undefined) {
      updateData.gender = { set: normalized.gender };
    }

    if (normalized.profileImage !== undefined) {
      updateData.profileImage = normalized.profileImage;
    }

    if (normalized.dayOfBirth !== undefined) {
      this.validatePatientAge(normalized.dayOfBirth);
      updateData.dayOfBirth = normalized.dayOfBirth;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({
        where: { id: patientId },
        data: updateData,
      });
    }

    if (normalized.isActive === false) {
      return this.deactivatePatient(patientId);
    }

    if (normalized.isActive === true) {
      await this.reactivatePatient(patientId);
    }

    this.logger.log(`Patient updated successfully: ${patientId}`);

    return this.getPatientById(patientId);
  }

  async canDeactivatePatient(
    patientId: string,
  ): Promise<CanDeactivatePatientResponse> {
    await this.getPatientEntity(patientId);

    const futureAppointments = await this.hasFutureAppointments(patientId);
    const reasons: string[] = [];

    if (futureAppointments > 0) {
      reasons.push(
        `El paciente tiene ${futureAppointments} cita(s) futura(s) pendiente(s).`,
      );
    }

    return {
      canDeactivate: reasons.length === 0,
      reasons,
      warnings: [],
      metadata: { futureAppointments },
    };
  }

  async deactivatePatient(patientId: string): Promise<AdminPatientDetailDto> {
    const patient = await this.getPatientEntity(patientId);

    if (!patient.isActive) {
      throw new PatientCannotBeDeactivatedException(
        ['El paciente ya se encuentra inactivo.'],
        { reason: 'already_inactive' },
      );
    }

    const validation = await this.canDeactivatePatient(patientId);

    if (!validation.canDeactivate) {
      throw new PatientCannotBeDeactivatedException(
        validation.reasons,
        validation.metadata,
      );
    }

    await this.prisma.user.update({
      where: { id: patientId },
      data: { isActive: false },
    });

    this.logger.log(`Patient deactivated successfully: ${patientId}`);

    return this.getPatientById(patientId);
  }

  async reactivatePatient(patientId: string): Promise<AdminPatientDetailDto> {
    const patient = await this.getPatientEntity(patientId);

    if (patient.isActive) {
      return this.getPatientById(patientId);
    }

    await this.prisma.user.update({
      where: { id: patientId },
      data: { isActive: true },
    });

    this.logger.log(`Patient reactivated successfully: ${patientId}`);

    return this.getPatientById(patientId);
  }

  /**
   * ADMIN: Elimina (desactiva) un paciente
   */
  async deletePatient(patientId: string): Promise<{ message: string }> {
    this.logger.log(`Deleting patient: ${patientId}`);

    await this.deactivatePatient(patientId);

    return { message: 'Patient deactivated successfully' };
  }

  private async getPatientEntity(patientId: string) {
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
    });

    if (!patient || patient.role !== Role.PATIENT) {
      throw new PatientNotFoundException(patientId);
    }

    return patient;
  }

  private normalizeCreatePayload(
    payload: CreatePatientDto,
  ): NormalizedCreatePatientPayload {
    const {
      dni,
      email,
      password,
      firstName,
      lastName,
      phone,
      gender,
      dayOfBirth,
      profileImage,
    } = payload;

    const normalizedDayOfBirth = new Date(dayOfBirth);
    if (Number.isNaN(normalizedDayOfBirth.getTime())) {
      throw new BadRequestException('Fecha de nacimiento inválida.');
    }

    const trimmedPhone = phone?.trim();
    const trimmedProfileImage = profileImage?.trim();

    return {
      dni: dni.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: trimmedPhone && trimmedPhone.length > 0 ? trimmedPhone : null,
      gender,
      dayOfBirth: normalizedDayOfBirth,
      profileImage:
        trimmedProfileImage && trimmedProfileImage.length > 0
          ? trimmedProfileImage
          : null,
      isActive: true,
    };
  }

  private normalizeUpdatePayload(
    payload: UpdatePatientDto,
  ): NormalizedUpdatePatientPayload {
    const {
      dni,
      email,
      firstName,
      lastName,
      phone,
      gender,
      profileImage,
      isActive,
      dayOfBirth,
    } = payload;

    const normalized: NormalizedUpdatePatientPayload = {};

    if (typeof dni === 'string') {
      const trimmedDni = dni.trim();
      if (trimmedDni.length > 0) {
        normalized.dni = trimmedDni;
      }
    }

    if (typeof email === 'string') {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail.length > 0) {
        normalized.email = normalizedEmail;
      }
    }

    if (typeof firstName === 'string') {
      const trimmedFirstName = firstName.trim();
      if (trimmedFirstName.length > 0) {
        normalized.firstName = trimmedFirstName;
      }
    }

    if (typeof lastName === 'string') {
      const trimmedLastName = lastName.trim();
      if (trimmedLastName.length > 0) {
        normalized.lastName = trimmedLastName;
      }
    }

    if (typeof phone === 'string') {
      const trimmedPhone = phone.trim();
      normalized.phone = trimmedPhone.length > 0 ? trimmedPhone : null;
    }

    if (gender !== undefined) {
      normalized.gender = gender;
    }

    if (typeof profileImage === 'string') {
      const trimmedProfileImage = profileImage.trim();
      normalized.profileImage =
        trimmedProfileImage.length > 0 ? trimmedProfileImage : null;
    }

    if (typeof isActive === 'boolean') {
      normalized.isActive = isActive;
    }

    if (typeof dayOfBirth === 'string') {
      const dateValue = new Date(dayOfBirth);
      if (Number.isNaN(dateValue.getTime())) {
        throw new BadRequestException('Fecha de nacimiento inválida.');
      }
      normalized.dayOfBirth = dateValue;
    }

    return normalized;
  }

  private async ensureUniqueIdentifiers(
    identifiers: NormalizedPatientIdentifiers,
    options: { excludePatientId?: string } = {},
  ): Promise<void> {
    const { excludePatientId } = options;

    if (identifiers.dni) {
      const where: Prisma.UserWhereInput = { dni: identifiers.dni };
      if (excludePatientId) {
        where.id = { not: excludePatientId };
      }
      const existingDni = await this.prisma.user.findFirst({ where });

      if (existingDni) {
        throw new PatientAlreadyExistsException('dni', identifiers.dni);
      }
    }

    if (identifiers.email) {
      const where: Prisma.UserWhereInput = { email: identifiers.email };
      if (excludePatientId) {
        where.id = { not: excludePatientId };
      }
      const existingEmail = await this.prisma.user.findFirst({ where });

      if (existingEmail) {
        throw new PatientAlreadyExistsException('email', identifiers.email);
      }
    }
  }

  private validatePatientAge(dayOfBirth: Date): void {
    if (!(dayOfBirth instanceof Date) || Number.isNaN(dayOfBirth.getTime())) {
      throw new BadRequestException('Fecha de nacimiento inválida.');
    }

    const age = this.calculateAge(dayOfBirth);

    if (age < MIN_PATIENT_AGE) {
      throw new BadRequestException(
        `El paciente debe tener al menos ${MIN_PATIENT_AGE} años`,
      );
    }
  }

  private async hasFutureAppointments(patientId: string): Promise<number> {
    return this.prisma.appointment.count({
      where: {
        userId: patientId,
        slot: { startAt: { gte: new Date() } },
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        },
      },
    });
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
