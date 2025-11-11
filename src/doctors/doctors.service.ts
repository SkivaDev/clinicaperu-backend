import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HashingService } from 'src/common/hashing/hashing.service';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import {
  PublicDoctorListDto,
  PublicDoctorDetailDto,
} from './dto/public-doctor.dto';
import {
  DoctorStatisticsDto,
  DateRangeEnum,
  CurrentMonthMetricsDto,
  HistoricalMetricsDto,
  GeneralMetricsDto,
  MonthlyDataDto,
  MonthlyNoShowRateDto,
  UpcomingAppointmentDto,
} from './dto/doctor-statistics.dto';
import { S3Service } from 'src/common/s3/s3.service';

@Injectable()
export class DoctorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService,
    private readonly s3Service: S3Service,
  ) {}

  async createDoctor(dto: CreateUserDto & CreateDoctorDto) {
    try {
      // 1. Validar duplicados básicos (dni, email, cmp)
      const existingUser = await this.prisma.user.findFirst({
        where: { OR: [{ dni: dto.dni }, { email: dto.email }] },
      });
      if (existingUser) {
        throw new ConflictException('Email o DNI ya están registrados');
      }

      const existingCmp = await this.prisma.doctor.findUnique({
        where: { cmp: dto.cmp },
      });
      if (existingCmp) {
        throw new ConflictException('CMP ya está registrado');
      }

      // 2. Hashear password
      const hashedPassword = await this.hashingService.hash(dto.password);

      // 3. Crear User + Doctor en una transacción
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            dni: dto.dni,
            email: dto.email,
            passwordHash: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            dayOfBirth: new Date(dto.dayOfBirth),
            phone: dto.phone,
            gender: dto.gender,
            role: 'DOCTOR',
          },
        });

        const doctor = await tx.doctor.create({
          data: {
            cmp: dto.cmp,
            isActive: dto.isActive,
            yearsOfExperience: dto.yearsOfExperience,
            consultationPrice: dto.consultationPrice,
            clinic: { connect: { id: dto.clinicId } },
            specialty: { connect: { id: dto.specialtyId } },
            user: { connect: { id: user.id } },
          },
        });

        //retornar sin el passwordHash
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash: _, ...userWithoutPassword } = user;
        return { ...doctor, user: userWithoutPassword };
      });

      return result;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error al registrar al doctor');
    }
  }

  async getDoctorDetail(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: { user: true, clinic: true, specialty: true, schedules: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    // Excluir passwordHash del usuario
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = doctor.user;

    // Generar URL prefirmada de S3 para la imagen de perfil
    const profileImageUrl = await this.generateProfileImageUrl(
      userWithoutPassword.profileImage,
    );

    return {
      ...doctor,
      user: { ...userWithoutPassword, profileImage: profileImageUrl },
    };
  }

  async getDoctorIds(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        clinicId: true,
        specialtyId: true,
      },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  // async updateDoctor(id: string, dto: UpdateDoctorDto) {
  //   await this.getDoctorIds(id);
  //   return this.prisma.doctor.update({
  //     where: { id },
  //     data: {
  //       cmp: dto.cmp,
  //       clinic: dto.clinicId ? { connect: { id: dto.clinicId } } : undefined,
  //       specialty: dto.specialtyId
  //         ? { connect: { id: dto.specialtyId } }
  //         : undefined,
  //     },
  //   });
  // }

  async updateDoctor(id: string, dto: UpdateUserDto & UpdateDoctorDto) {
    // Verificar existencia
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor no encontrado');
    }

    // Si hay password, hashearlo
    let passwordHash: string | undefined;
    if (dto.password) {
      passwordHash = await this.hashingService.hash(dto.password);
    }

    // Actualizar en transacción
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: doctor.userId },
        data: {
          dni: dto.dni,
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          gender: dto.gender,
          dayOfBirth: dto.dayOfBirth ? new Date(dto.dayOfBirth) : undefined,
          ...(passwordHash && { passwordHash }),
        },
      });

      const updatedDoctor = await tx.doctor.update({
        where: { id },
        data: {
          cmp: dto.cmp,
          isActive: dto.isActive,
          yearsOfExperience: dto.yearsOfExperience,
          consultationPrice: dto.consultationPrice,
          clinic: dto.clinicId ? { connect: { id: dto.clinicId } } : undefined,
          specialty: dto.specialtyId
            ? { connect: { id: dto.specialtyId } }
            : undefined,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      return { ...updatedDoctor, user: userWithoutPassword };
    });

    // Generar URL prefirmada de S3 para la imagen de perfil
    const profileImageUrl = await this.generateProfileImageUrl(
      result.user.profileImage,
    );

    return {
      ...result,
      user: { ...result.user, profileImage: profileImageUrl },
    };
  }

  async deleteDoctor(id: string) {
    await this.getDoctorIds(id);
    const doctor = await this.prisma.doctor.delete({
      where: { id },
      include: { user: true },
    });

    // Excluir passwordHash del usuario
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = doctor.user;

    // Generar URL prefirmada de S3 para la imagen de perfil
    const profileImageUrl = await this.generateProfileImageUrl(
      userWithoutPassword.profileImage,
    );

    return {
      ...doctor,
      user: { ...userWithoutPassword, profileImage: profileImageUrl },
    };
  }

  async listDoctors() {
    const doctors = await this.prisma.doctor.findMany({
      include: { user: true, clinic: true, specialty: true },
    });

    // Excluir passwordHash de cada usuario y generar URLs de S3
    return Promise.all(
      doctors.map(async (doctor) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...userWithoutPassword } = doctor.user;

        // Generar URL prefirmada de S3 para la imagen de perfil
        const profileImageUrl = await this.generateProfileImageUrl(
          userWithoutPassword.profileImage,
        );

        return {
          ...doctor,
          user: { ...userWithoutPassword, profileImage: profileImageUrl },
        };
      }),
    );
  }

  async listDoctorsByClinic(clinicId: string) {
    const doctors = await this.prisma.doctor.findMany({
      where: { clinicId },
      include: { user: true, specialty: true },
    });

    // Excluir passwordHash de cada usuario y generar URLs de S3
    return Promise.all(
      doctors.map(async (doctor) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...userWithoutPassword } = doctor.user;

        // Generar URL prefirmada de S3 para la imagen de perfil
        const profileImageUrl = await this.generateProfileImageUrl(
          userWithoutPassword.profileImage,
        );

        return {
          ...doctor,
          user: { ...userWithoutPassword, profileImage: profileImageUrl },
        };
      }),
    );
  }

  async listDoctorsBySpecialty(specialtyId: string) {
    const doctors = await this.prisma.doctor.findMany({
      where: { specialtyId },
      include: { user: true, clinic: true },
    });

    // Excluir passwordHash de cada usuario y generar URLs de S3
    return Promise.all(
      doctors.map(async (doctor) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...userWithoutPassword } = doctor.user;

        // Generar URL prefirmada de S3 para la imagen de perfil
        const profileImageUrl = await this.generateProfileImageUrl(
          userWithoutPassword.profileImage,
        );

        return {
          ...doctor,
          user: { ...userWithoutPassword, profileImage: profileImageUrl },
        };
      }),
    );
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

  // Métodos públicos para el controlador público
  async findPublicDoctors(params: {
    search?: string;
    specialtyId?: string;
    clinicId?: string;
    page: number;
    limit: number;
  }): Promise<{
    data: PublicDoctorListDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { search, specialtyId, clinicId, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      user: {
        isActive: true,
      },
    };

    if (search) {
      where.OR = [
        {
          user: {
            firstName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            lastName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    if (specialtyId) {
      where.specialtyId = specialtyId;
    }

    if (clinicId) {
      where.clinicId = clinicId;
    }

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where,
        include: {
          user: true,
          specialty: true,
          clinic: true,
          appointments: {
            select: {
              id: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          user: {
            firstName: 'asc',
          },
        },
      }),
      this.prisma.doctor.count({ where }),
    ]);

    // Generar estructura segura para la respuesta doctores publicos
    const data: PublicDoctorListDto[] = await Promise.all(
      doctors.map(async (doctor) => {
        return {
          id: doctor.id,
          cmp: doctor.cmp,
          yearsOfExperience: doctor.yearsOfExperience || null,
          consultationPrice: doctor.consultationPrice || null,
          attendedPatients: doctor.attendedPatients,
          rating: doctor.rating > 0 ? doctor.rating : undefined,
          user: {
            id: doctor.user.id,
            firstName: doctor.user.firstName,
            lastName: doctor.user.lastName,
            profileImage: doctor.user.profileImage,
            email: doctor.user.email,
            phone: doctor.user.phone || null,
          },
          specialty: {
            id: doctor.specialty.id,
            name: doctor.specialty.name,
          },
          clinic: {
            id: doctor.clinic.id,
            name: doctor.clinic.name,
          },
        };
      }),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPublicDoctorById(
    id: string,
  ): Promise<PublicDoctorDetailDto | null> {
    const doctor = await this.prisma.doctor.findUnique({
      where: {
        id,
        user: {
          isActive: true,
        },
      },
      include: {
        user: true,
        specialty: true,
        clinic: true,
        schedules: {
          where: {
            isActive: true,
          },
        },
        appointments: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!doctor) {
      return null;
    }

    const rating = doctor.rating > 0 ? doctor.rating : undefined;

    // Generar URL prefirmada de S3 para la imagen de perfil
    const profileImageUrl = await this.generateProfileImageUrl(
      doctor.user.profileImage,
    );

    return {
      id: doctor.id,
      cmp: doctor.cmp,
      yearsOfExperience: doctor.yearsOfExperience || null,
      consultationPrice: doctor.consultationPrice || null,
      attendedPatients: doctor.attendedPatients,
      rating,
      user: {
        id: doctor.user.id,
        firstName: doctor.user.firstName,
        lastName: doctor.user.lastName,
        profileImage: profileImageUrl,
        email: doctor.user.email,
        phone: doctor.user.phone || null,
      },

      specialty: {
        id: doctor.specialty.id,
        name: doctor.specialty.name,
      },
      clinic: {
        id: doctor.clinic.id,
        name: doctor.clinic.name,
      },
      // totalAppointments: doctor.appointments.length,
      schedules: doctor.schedules.map((schedule) => ({
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      })),
    };
  }

  /**
   * Obtiene estadísticas completas del doctor
   * Incluye métricas del mes actual, históricas y generales
   * Optimizado con queries SQL agregadas
   */
  async getStatistics(
    doctorId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dateRange: DateRangeEnum = DateRangeEnum.THIS_MONTH,
  ): Promise<DoctorStatisticsDto> {
    // Verificar que el doctor existe
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, consultationPrice: true, rating: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor no encontrado');
    }

    // Calcular fechas según el rango
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const endOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    // Obtener métricas del mes actual en paralelo
    const [currentMonthMetrics, previousMonthMetrics] = await Promise.all([
      this.getCurrentMonthMetrics(
        doctorId,
        startOfCurrentMonth,
        endOfCurrentMonth,
        doctor.consultationPrice,
      ),
      this.getCurrentMonthMetrics(
        doctorId,
        startOfPreviousMonth,
        endOfPreviousMonth,
        doctor.consultationPrice,
      ),
    ]);

    // Calcular variación vs mes anterior
    const variationVsPreviousMonth =
      previousMonthMetrics.totalAttended > 0
        ? ((currentMonthMetrics.totalAttended -
            previousMonthMetrics.totalAttended) /
            previousMonthMetrics.totalAttended) *
          100
        : 0;

    currentMonthMetrics.variationVsPreviousMonth = Number(
      variationVsPreviousMonth.toFixed(2),
    );

    // Obtener métricas históricas (últimos 6 meses)
    const historicalMetrics = await this.getHistoricalMetrics(doctorId);

    // Obtener métricas generales
    const generalMetrics = await this.getGeneralMetrics(
      doctorId,
      doctor.rating,
    );

    return {
      currentMonth: currentMonthMetrics,
      historical: historicalMetrics,
      general: generalMetrics,
      generatedAt: new Date(),
    };
  }

  /**
   * Calcula métricas del mes actual (o cualquier rango de fechas)
   * Usa queries optimizadas con agregaciones
   */
  private async getCurrentMonthMetrics(
    doctorId: string,
    startDate: Date,
    endDate: Date,
    consultationPrice: number | null,
  ): Promise<CurrentMonthMetricsDto> {
    // Query optimizada con agregaciones usando Prisma raw SQL
    const metricsResult = await this.prisma.$queryRaw<
      Array<{
        total_attended: bigint;
        total_cancelled: bigint;
        total_no_shows: bigint;
      }>
    >`
      SELECT 
        COUNT(CASE WHEN status = 'ATTENDED' THEN 1 END) as total_attended,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as total_cancelled,
        COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) as total_no_shows
      FROM "Appointment"
      WHERE "doctorId" = ${doctorId}
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
    `;

    const metrics = metricsResult[0];
    const totalAttended = Number(metrics.total_attended);
    const totalCancelled = Number(metrics.total_cancelled);
    const totalNoShows = Number(metrics.total_no_shows);

    // Calcular tasa de ocupación (slots booked / slots totales)
    const occupancyResult = await this.prisma.$queryRaw<
      Array<{
        total_slots: bigint;
        booked_slots: bigint;
      }>
    >`
      SELECT 
        COUNT(*) as total_slots,
        COUNT(CASE WHEN status IN ('BOOKED', 'HELD') THEN 1 END) as booked_slots
      FROM "Slot" s
      INNER JOIN "Schedule" sch ON s."scheduleId" = sch.id
      WHERE sch."doctorId" = ${doctorId}
        AND s."startAt" >= ${startDate}
        AND s."startAt" <= ${endDate}
        AND s."isActive" = true
    `;

    const occupancy = occupancyResult[0];
    const totalSlots = Number(occupancy.total_slots);
    const bookedSlots = Number(occupancy.booked_slots);
    const occupancyRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

    // Calcular ingresos estimados
    const estimatedRevenue = totalAttended * (consultationPrice || 0);

    return {
      totalAttended,
      totalCancelled,
      totalNoShows,
      occupancyRate: Number(occupancyRate.toFixed(2)),
      estimatedRevenue: Number(estimatedRevenue.toFixed(2)),
    };
  }

  /**
   * Obtiene métricas históricas de los últimos 6 meses
   */
  private async getHistoricalMetrics(
    doctorId: string,
  ): Promise<HistoricalMetricsDto> {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // Citas atendidas por mes
    const attendedByMonthResult = await this.prisma.$queryRaw<
      Array<{
        month: string;
        count: bigint;
      }>
    >`
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        COUNT(*) as count
      FROM "Appointment"
      WHERE "doctorId" = ${doctorId}
        AND status = 'ATTENDED'
        AND "createdAt" >= ${sixMonthsAgo}
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY month ASC
    `;

    const attendedByMonth: MonthlyDataDto[] = attendedByMonthResult.map(
      (row) => ({
        month: row.month,
        count: Number(row.count),
      }),
    );

    // Tasa de no-show por mes
    const noShowRateResult = await this.prisma.$queryRaw<
      Array<{
        month: string;
        total: bigint;
        no_shows: bigint;
      }>
    >`
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) as no_shows
      FROM "Appointment"
      WHERE "doctorId" = ${doctorId}
        AND "createdAt" >= ${sixMonthsAgo}
        AND status IN ('ATTENDED', 'NO_SHOW')
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY month ASC
    `;

    const noShowRateByMonth: MonthlyNoShowRateDto[] = noShowRateResult.map(
      (row) => {
        const total = Number(row.total);
        const noShows = Number(row.no_shows);
        const rate = total > 0 ? (noShows / total) * 100 : 0;
        return {
          month: row.month,
          rate: Number(rate.toFixed(2)),
        };
      },
    );

    return {
      attendedByMonth,
      noShowRateByMonth,
    };
  }

  /**
   * Obtiene métricas generales del doctor
   */
  private async getGeneralMetrics(
    doctorId: string,
    rating: number,
  ): Promise<GeneralMetricsDto> {
    // Total de pacientes únicos atendidos
    const uniquePatientsResult = await this.prisma.$queryRaw<
      Array<{
        unique_patients: bigint;
      }>
    >`
      SELECT COUNT(DISTINCT "userId") as unique_patients
      FROM "Appointment"
      WHERE "doctorId" = ${doctorId}
        AND status = 'ATTENDED'
    `;

    const totalUniquePatientsAttended = Number(
      uniquePatientsResult[0].unique_patients,
    );

    // Próximas citas (siguientes 7 días)
    const now = new Date();
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(now.getDate() + 7);

    const upcomingAppointmentsData = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        slot: {
          startAt: {
            gte: now,
            lte: sevenDaysLater,
          },
        },
      },
      include: {
        slot: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        slot: {
          startAt: 'asc',
        },
      },
      take: 10, // Limitar a 10 próximas citas
    });

    const upcomingAppointments: UpcomingAppointmentDto[] =
      upcomingAppointmentsData.map((appointment) => ({
        id: appointment.id,
        startAt: appointment.slot.startAt,
        endAt: appointment.slot.endAt,
        patientName: `${appointment.user.firstName} ${appointment.user.lastName}`,
        reason: appointment.reason || undefined,
      }));

    return {
      totalUniquePatientsAttended,
      averageRating: rating > 0 ? Number(rating.toFixed(1)) : undefined,
      upcomingAppointments,
    };
  }
}
