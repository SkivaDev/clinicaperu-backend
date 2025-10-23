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
import { Prisma, SlotStatus } from '@prisma/client';

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
