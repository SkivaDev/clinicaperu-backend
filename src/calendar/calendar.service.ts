import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CalendarResponseDto,
  CalendarSlotDto,
} from './dto/calendar-response.dto';
import {
  CalendarScope,
  GetCalendarQueryDto,
} from './dto/get-calendar-query.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, SlotStatus, AppointmentStatus } from '@prisma/client';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import {
  CalendarEventsResponseDto,
  CalendarEventDto,
  DoctorInfoDto,
  PatientInfoDto,
} from './dto/calendar-event.dto';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getCalendar(query: GetCalendarQueryDto): Promise<CalendarResponseDto> {
    const { start, view, scope, doctorId, clinicId } = query;

    const dateRange = this.calculateDateRange(start, view);
    const slots = await this.getCalendarSlots(dateRange, {
      doctorId,
      clinicId,
      scope,
    });

    const summary = this.calculateSummary(slots);

    return {
      dateRange,
      slots,
      summary,
    };
  }

  async getDoctorCalendar(
    query: GetCalendarQueryDto,
    doctorUserId?: string,
  ): Promise<CalendarResponseDto> {
    // Si viene doctorUserId, buscar el doctorId correspondiente
    let doctorId = query.doctorId;

    if (doctorUserId && !doctorId) {
      const doctor = await this.prisma.doctor.findFirst({
        where: { userId: doctorUserId },
        select: { id: true },
      });

      if (!doctor) {
        throw new NotFoundException('Doctor not found');
      }
      doctorId = doctor.id;
    }

    const dateRange = this.calculateDateRange(query.start, query.view);
    const slots = await this.getCalendarSlots(dateRange, {
      doctorId,
      scope: CalendarScope.DOCTOR,
      includeAppointments: true,
    });

    const summary = this.calculateSummary(slots);

    return {
      dateRange,
      slots,
      summary,
    };
  }

  private async getCalendarSlots(
    dateRange: { start: Date; end: Date },
    filters: {
      doctorId?: string;
      clinicId?: string;
      scope?: CalendarScope;
      includeAppointments?: boolean;
      patientUserId?: string;
    },
  ): Promise<CalendarSlotDto[]> {
    const { start, end } = dateRange;

    const where: Prisma.SlotWhereInput = {
      startAt: {
        gte: start,
        lte: end,
      },
    };

    // Filtrar por doctor si se especifica
    if (filters.doctorId) {
      where.schedule = { doctorId: filters.doctorId } as any;
    }

    // Filtrar por clínica si se especifica
    if (filters.clinicId) {
      where.schedule = {
        ...where.schedule,
        doctor: { clinicId: filters.clinicId },
      } as any;
    }

    // Filtrar por paciente (usuario) si se especifica
    if (filters.patientUserId) {
      where.appointment = {
        userId: filters.patientUserId,
      };
    }

    const slots = await this.prisma.slot.findMany({
      where,
      include: {
        schedule: {
          include: {
            doctor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
                specialty: {
                  select: {
                    name: true,
                  },
                },
                clinic: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        appointment: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                dni: true,
              },
            },
          },
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    return slots.map((slot) => this.mapSlotToDto(slot));
  }

  private mapSlotToDto(slot: any): CalendarSlotDto {
    return {
      id: slot.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
      status: slot.status,
      holdExpiresAt: slot.holdExpiresAt,
      doctor: {
        id: slot.schedule.doctor.id,
        cmp: slot.schedule.doctor.cmp,
        user: {
          firstName: slot.schedule.doctor.user.firstName,
          lastName: slot.schedule.doctor.user.lastName,
        },
        specialty: {
          name: slot.schedule.doctor.specialty.name,
        },
      },
      clinic: {
        id: slot.schedule.doctor.clinic.id,
        name: slot.schedule.doctor.clinic.name,
      },
      appointment: slot.appointment
        ? {
            id: slot.appointment.id,
            status: slot.appointment.status,
            reason: slot.appointment.reason,
            notes: slot.appointment.notes,
            patient: {
              id: slot.appointment.user.id,
              firstName: slot.appointment.user.firstName,
              lastName: slot.appointment.user.lastName,
              dni: slot.appointment.user.dni,
            },
          }
        : undefined,
    };
  }

  private calculateDateRange(
    start: string,
    view: string,
  ): { start: Date; end: Date } {
    const startDate = new Date(start);
    let endDate = new Date(startDate);

    switch (view) {
      case 'day':
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'week':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'month':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      default:
        endDate.setDate(endDate.getDate() + 1);
    }

    return { start: startDate, end: endDate };
  }

  private calculateSummary(slots: CalendarSlotDto[]) {
    const summary = {
      totalSlots: slots.length,
      available: 0,
      booked: 0,
      held: 0,
      blocked: 0,
    };

    slots.forEach((slot) => {
      switch (slot.status) {
        case SlotStatus.FREE:
          summary.available++;
          break;
        case SlotStatus.BOOKED:
          summary.booked++;
          break;
        case SlotStatus.HELD:
          summary.held++;
          break;
        case SlotStatus.BLOCKED:
          summary.blocked++;
          break;
      }
    });

    return summary;
  }

  async getPatientCalendar(
    query: GetCalendarQueryDto,
    patientUserId?: string,
  ): Promise<CalendarResponseDto> {
    const dateRange = this.calculateDateRange(query.start, query.view);
    const slots = await this.getCalendarSlots(dateRange, {
      clinicId: query.clinicId,
      scope: CalendarScope.PATIENT,
      includeAppointments: true,
      patientUserId,
    });

    const summary = this.calculateSummary(slots);

    return {
      dateRange,
      slots,
      summary,
    };
  }

  /**
   * HU-022: API de Calendario - Obtiene slots y appointments en formato calendario
   * Retorna eventos combinados de slots y appointments con filtros avanzados
   */
  async getCalendarEvents(
    query: CalendarQueryDto,
  ): Promise<CalendarEventsResponseDto> {
    const {
      doctorId,
      patientId,
      start,
      end,
      status,
      appointmentStatus,
      limit = 500,
      offset = 0,
    } = query;

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Query builder para slots
    const slotWhere: Prisma.SlotWhereInput = {
      startAt: {
        gte: startDate,
        lte: endDate,
      },
      isActive: true,
    };

    // Filtrar por doctor
    if (doctorId) {
      slotWhere.schedule = {
        doctorId,
      };
    }

    // Filtrar por status de slot
    if (status) {
      slotWhere.status = status;
    }

    // Query builder para appointments
    const appointmentWhere: Prisma.AppointmentWhereInput = {
      slot: {
        startAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    };

    // Filtrar por paciente
    if (patientId) {
      appointmentWhere.userId = patientId;
    }

    // Filtrar por doctor en appointments
    if (doctorId) {
      appointmentWhere.doctorId = doctorId;
    }

    // Filtrar por status de appointment
    if (appointmentStatus) {
      appointmentWhere.status = appointmentStatus;
    }

    // Ejecutar queries en paralelo
    const [slots, appointments] = await Promise.all([
      this.prisma.slot.findMany({
        where: slotWhere,
        include: {
          schedule: {
            include: {
              doctor: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
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
                },
              },
            },
          },
        },
        orderBy: {
          startAt: 'asc',
        },
      }),
      this.prisma.appointment.findMany({
        where: appointmentWhere,
        include: {
          slot: {
            include: {
              schedule: {
                include: {
                  doctor: {
                    include: {
                      user: {
                        select: {
                          firstName: true,
                          lastName: true,
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
                    },
                  },
                },
              },
            },
          },
          user: {
            select: {
              id: true,
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
      }),
    ]);

    // console.log(slots.map((slot) => slot.schedule.doctor));

    // Transformar slots a eventos
    const slotEvents: CalendarEventDto[] = slots
      .filter((slot) => slot.status === SlotStatus.FREE) // Solo slots libres
      .map((slot) => this.transformSlotToEvent(slot));

    // Transformar appointments a eventos
    const appointmentEvents: CalendarEventDto[] = appointments.map(
      (appointment) => this.transformAppointmentToEvent(appointment),
    );

    // Combinar y ordenar eventos
    const allEvents = [...slotEvents, ...appointmentEvents].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );

    // Aplicar paginación
    const paginatedEvents = allEvents.slice(offset, offset + limit);

    // Calcular metadata
    const totalSlots = slots.length;
    const bookedSlots = appointments.length;

    return {
      events: paginatedEvents,
      meta: {
        totalSlots,
        bookedSlots,
      },
    };
  }

  /**
   * Transforma un Slot en un CalendarEventDto
   */
  private transformSlotToEvent(slot: any): CalendarEventDto {
    // const doctorName = `${slot.schedule.doctor.user.firstName} ${slot.schedule.doctor.user.lastName}`;

    return {
      id: slot.id,
      type: 'slot',
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
      status: slot.status,
      doctor: {
        id: slot.schedule.doctor.id,
        cmp: slot.schedule.doctor.cmp,
        user: {
          firstName: slot.schedule.doctor.user.firstName,
          lastName: slot.schedule.doctor.user.lastName,
        },
      },
      specialty: {
        id: slot.schedule.doctor.specialty.id,
        name: slot.schedule.doctor.specialty.name,
      },
      clinic: {
        id: slot.schedule.doctor.clinic.id,
        name: slot.schedule.doctor.clinic.name,
      },
    };
  }

  /**
   * Transforma un Appointment en un CalendarEventDto
   */
  private transformAppointmentToEvent(appointment: any): CalendarEventDto {
    // const doctorName = `${appointment.slot.schedule.doctor.user.firstName} ${appointment.slot.schedule.doctor.user.lastName}`;
    // const patientName = `${appointment.user.firstName} ${appointment.user.lastName}`;

    return {
      id: appointment.id,
      type: 'appointment',
      startAt: appointment.slot.startAt.toISOString(),
      endAt: appointment.slot.endAt.toISOString(),
      status: appointment.status,
      doctor: {
        id: appointment.slot.schedule.doctor.id,
        cmp: appointment.slot.schedule.doctor.cmp,
        user: {
          firstName: appointment.slot.schedule.doctor.user.firstName,
          lastName: appointment.slot.schedule.doctor.user.lastName,
        },
      },
      specialty: {
        id: appointment.slot.schedule.doctor.specialty.id,
        name: appointment.slot.schedule.doctor.specialty.name,
      },
      clinic: {
        id: appointment.slot.schedule.doctor.clinic.id,
        name: appointment.slot.schedule.doctor.clinic.name,
      },
      patient: {
        id: appointment.user.id,
        firstName: appointment.user.firstName,
        lastName: appointment.user.lastName,
      },
    };
  }

  // create(createCalendarDto: CreateCalendarDto) {
  //   return 'This action adds a new calendar';
  // }

  // findAll() {
  //   return `This action returns all calendar`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} calendar`;
  // }

  // update(id: number, updateCalendarDto: UpdateCalendarDto) {
  //   return `This action updates a #${id} calendar`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} calendar`;
  // }
}
