import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SlotStatus } from '@prisma/client';
import {
  AvailabilityDashboardDto,
  DoctorWithSlotsDto,
  SpecialtyWithStatsDto,
  NextAvailableSlotDto,
} from './dto/availability-dashboard.dto';
import {
  DashboardFiltersDto,
  CalendarViewEnum,
} from './dto/dashboard-filters.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene el dashboard de disponibilidad optimizado para pacientes
   * Modo inteligente:
   * - Con doctorId: Retorna calendario completo del doctor con todos los slots
   * - Sin doctorId: Retorna dashboard general con especialidades y doctores
   */
  async getDashboard(
    filters: DashboardFiltersDto,
  ): Promise<AvailabilityDashboardDto> {
    // ✅ Modo calendario: Si hay doctorId, retornar todos los slots del doctor
    if (filters.doctorId) {
      return this.getDoctorCalendarMode(filters);
    }

    // ✅ Modo dashboard general: Sin doctorId, retornar vista general
    return this.getGeneralDashboardMode(filters);
  }

  /**
   * Modo dashboard general: Especialidades + Doctores + Stats
   */
  private async getGeneralDashboardMode(
    filters: DashboardFiltersDto,
  ): Promise<AvailabilityDashboardDto> {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7); // Próximos 7 días

    // ✅ Query optimizada con joins y agregaciones en paralelo
    const [specialtiesData, doctorsData, statsData] = await Promise.all([
      // 1. Especialidades con contador de slots disponibles
      this.getSpecialtiesWithStats(filters, startDate, endDate),

      // 2. Doctores con próximos slots disponibles
      this.getDoctorsWithSlots(filters, startDate, endDate),

      // 3. Estadísticas globales
      this.getGlobalStats(filters, startDate, endDate),
    ]);

    return {
      specialties: specialtiesData,
      doctors: doctorsData,
      stats: {
        totalAvailableSlots: statsData.totalFreeSlots,
        availableDoctors: doctorsData.length,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    };
  }

  /**
   * Modo calendario: Retorna doctor específico con TODOS sus slots en el rango
   */
  private async getDoctorCalendarMode(
    filters: DashboardFiltersDto,
  ): Promise<AvailabilityDashboardDto> {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date();

    // Calcular rango basado en la vista
    const dateRange = this.calculateDateRangeByView(
      startDate,
      filters.view || CalendarViewEnum.WEEK,
    );

    // Obtener doctor con todos sus slots en el rango
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: filters.doctorId, isActive: true },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        specialty: {
          select: {
            id: true,
            name: true,
          },
        },
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
        schedules: {
          where: { isActive: true },
          include: {
            slots: {
              where: {
                status: SlotStatus.FREE,
                startAt: { gte: dateRange.start, lte: dateRange.end },
              },
              orderBy: { startAt: 'asc' },
            },
          },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${filters.doctorId} not found`);
    }

    // Extraer todos los slots y ordenarlos
    const allSlots = doctor.schedules
      .flatMap((schedule) => schedule.slots)
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    const slots: NextAvailableSlotDto[] = allSlots.map((slot) => ({
      id: slot.id,
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
    }));

    // Calcular estadísticas
    const totalAvailableSlots = allSlots.filter(
      (slot) => slot.status === SlotStatus.FREE,
    ).length;
    const availableDoctors = 1;

    return {
      doctor: {
        id: doctor.id,
        cmp: doctor.cmp,
        consultationPrice: doctor.consultationPrice,
        rating: doctor.rating,
        user: {
          firstName: doctor.user.firstName,
          lastName: doctor.user.lastName,
          profileImage: doctor.user.profileImage,
        },
        specialty: {
          id: doctor.specialty.id,
          name: doctor.specialty.name,
        },
        clinic: {
          id: doctor.clinic.id,
          name: doctor.clinic.name,
        },
        nextAvailableSlots: slots.slice(0, 5), // Primeros 5 para preview
      },
      slots, // TODOS los slots para el calendario
      stats: {
        totalAvailableSlots,
        availableDoctors,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        },
      },
    };
  }

  /**
   * Calcula el rango de fechas basado en la vista del calendario
   */
  private calculateDateRangeByView(
    startDate: Date,
    view: CalendarViewEnum,
  ): { start: Date; end: Date } {
    const start = new Date(startDate);
    const end = new Date(startDate);

    switch (view) {
      case CalendarViewEnum.DAY:
        end.setDate(end.getDate() + 1);
        break;
      case CalendarViewEnum.WEEK:
        end.setDate(end.getDate() + 7);
        break;
      case CalendarViewEnum.MONTH:
        end.setMonth(end.getMonth() + 1);
        break;
      default:
        end.setDate(end.getDate() + 7); // Default: semana
    }

    return { start, end };
  }

  /**
   * Obtiene especialidades con estadísticas de disponibilidad
   */
  private async getSpecialtiesWithStats(
    filters: DashboardFiltersDto,
    startDate: Date,
    endDate: Date,
  ): Promise<SpecialtyWithStatsDto[]> {
    const specialties = await this.prisma.specialty.findMany({
      where: {
        isActive: true,
        ...(filters.specialtyId && { id: filters.specialtyId }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        doctors: {
          where: {
            isActive: true,
            ...(filters.clinicId && { clinicId: filters.clinicId }),
          },
          select: {
            id: true,
            schedules: {
              where: { isActive: true },
              select: {
                slots: {
                  where: {
                    status: SlotStatus.FREE,
                    startAt: { gte: startDate, lte: endDate },
                  },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    return specialties.map((specialty) => {
      const doctorsWithSlots = specialty.doctors.filter((doctor) =>
        doctor.schedules.some((schedule) => schedule.slots.length > 0),
      );

      const totalSlots = specialty.doctors.reduce(
        (total, doctor) =>
          total +
          doctor.schedules.reduce(
            (sum, schedule) => sum + schedule.slots.length,
            0,
          ),
        0,
      );

      return {
        id: specialty.id,
        name: specialty.name,
        description: specialty.description,
        availableSlots: totalSlots,
        availableDoctors: doctorsWithSlots.length,
      };
    });
  }

  /**
   * Obtiene doctores con sus próximos slots disponibles
   */
  private async getDoctorsWithSlots(
    filters: DashboardFiltersDto,
    startDate: Date,
    endDate: Date,
  ): Promise<DoctorWithSlotsDto[]> {
    const doctors = await this.prisma.doctor.findMany({
      where: {
        isActive: true,
        ...(filters.specialtyId && { specialtyId: filters.specialtyId }),
        ...(filters.clinicId && { clinicId: filters.clinicId }),
        schedules: {
          some: {
            isActive: true,
            slots: {
              some: {
                status: SlotStatus.FREE,
                startAt: { gte: startDate, lte: endDate },
              },
            },
          },
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        specialty: {
          select: {
            id: true,
            name: true,
          },
        },
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
        schedules: {
          where: { isActive: true },
          include: {
            slots: {
              where: {
                status: SlotStatus.FREE,
                startAt: { gte: startDate, lte: endDate },
              },
              orderBy: { startAt: 'asc' },
              take: 5, // Próximos 5 slots
            },
          },
        },
      },
      take: 12, // Top 12 doctores
      orderBy: [
        { rating: 'desc' }, // Ordenar por rating primero
        { user: { firstName: 'asc' } }, // Luego por nombre
      ],
    });

    return doctors.map((doctor) => {
      const allSlots = doctor.schedules
        .flatMap((schedule) => schedule.slots)
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
        .slice(0, 5);

      const nextAvailableSlots: NextAvailableSlotDto[] = allSlots.map(
        (slot) => ({
          id: slot.id,
          startAt: slot.startAt.toISOString(),
          endAt: slot.endAt.toISOString(),
        }),
      );

      return {
        id: doctor.id,
        cmp: doctor.cmp,
        consultationPrice: doctor.consultationPrice,
        rating: doctor.rating,
        user: {
          firstName: doctor.user.firstName,
          lastName: doctor.user.lastName,
          profileImage: doctor.user.profileImage,
        },
        specialty: {
          id: doctor.specialty.id,
          name: doctor.specialty.name,
        },
        clinic: {
          id: doctor.clinic.id,
          name: doctor.clinic.name,
        },
        nextAvailableSlots,
      };
    });
  }

  /**
   * Obtiene estadísticas globales de disponibilidad
   */
  private async getGlobalStats(
    filters: DashboardFiltersDto,
    startDate: Date,
    endDate: Date,
  ): Promise<{ totalFreeSlots: number }> {
    const whereClause = {
      startAt: { gte: startDate, lte: endDate },
      status: SlotStatus.FREE,
      schedule: {
        isActive: true,
        doctor: {
          isActive: true,
          ...(filters.specialtyId && { specialtyId: filters.specialtyId }),
          ...(filters.clinicId && { clinicId: filters.clinicId }),
        },
      },
    };

    const totalFreeSlots = await this.prisma.slot.count({
      where: whereClause,
    });

    return { totalFreeSlots };
  }
}
