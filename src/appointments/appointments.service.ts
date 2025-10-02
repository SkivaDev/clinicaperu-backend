import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
// import { CreateAppointmentDto } from './dto/create-appointment.dto';
// import { CalendarQueryDto } from './dto/calendar-query.dto';
// import { CalendarEventDto } from './dto/calendar-event.dto';
// import { AppointmentEntity } from './entities/appointment.entity';
// import { SlotStatus, AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async getAppointmentById(id: string): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new BadRequestException(`Appointment with id ${id} not found`);
    }

    return appointment;
  }

  async getAllAppointments(): Promise<AppointmentResponseDto[]> {
    const appointments = await this.prisma.appointment.findMany({
      include: {
        slot: true,
      },
    });

    return appointments;
  }

  //   async createAppointment(
  //     createAppointmentDto: CreateAppointmentDto,
  //   ): Promise<AppointmentEntity> {
  //     const { userId, doctorId, slotId, reason, notes } = createAppointmentDto;

  //     return await this.prisma.$transaction(async (tx) => {
  //       // Lock the slot with FOR UPDATE to prevent race conditions
  //       const slot = await tx.slot.findUnique({
  //         where: { id: slotId },
  //         include: {
  //           schedule: {
  //             include: {
  //               doctor: {
  //                 include: {
  //                   user: true,
  //                   specialty: true,
  //                   clinic: true,
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       });

  //       if (!slot) {
  //         throw new BadRequestException('Slot not found');
  //       }

  //       if (slot.doctorId !== doctorId) {
  //         throw new BadRequestException(
  //           'Slot does not belong to the specified doctor',
  //         );
  //       }

  //       if (slot.status !== SlotStatus.FREE) {
  //         throw new ConflictException('Slot is not available for booking');
  //       }

  //       // Check if slot is not expired (holdExpiresAt)
  //       if (slot.holdExpiresAt && slot.holdExpiresAt < new Date()) {
  //         throw new BadRequestException('Slot has expired');
  //       }

  //       // Update slot status to BOOKED
  //       await tx.slot.update({
  //         where: { id: slotId },
  //         data: { status: SlotStatus.BOOKED },
  //       });

  //       // Create the appointment
  //       const appointment = await tx.appointment.create({
  //         data: {
  //           userId,
  //           doctorId,
  //           slotId,
  //           reason,
  //           notes,
  //           status: AppointmentStatus.PENDING,
  //         },
  //       });

  //       return appointment;
  //     });
  //   }

  //   async getCalendarEvents(
  //     query: CalendarQueryDto,
  //   ): Promise<CalendarEventDto[]> {
  //     const { start, doctorId, clinicId } = query;
  //     const startDate = new Date(start);
  //     const endDate = new Date(startDate);
  //     endDate.setDate(endDate.getDate() + 7); // Get events for the week

  //     const whereClause: any = {
  //       startAt: {
  //         gte: startDate,
  //         lt: endDate,
  //       },
  //     };

  //     if (doctorId) {
  //       whereClause.schedule = {
  //         doctorId: doctorId,
  //       };
  //     }

  //     if (clinicId) {
  //       whereClause.schedule = {
  //         ...whereClause.schedule,
  //         doctor: {
  //           clinicId: clinicId,
  //         },
  //       };
  //     }

  //     // Get all slots for the week
  //     const slots = await this.prisma.slot.findMany({
  //       where: whereClause,
  //       include: {
  //         schedule: {
  //           include: {
  //             doctor: {
  //               include: {
  //                 user: true,
  //                 specialty: true,
  //                 clinic: true,
  //               },
  //             },
  //           },
  //         },
  //         appointment: {
  //           include: {
  //             user: true,
  //           },
  //         },
  //       },
  //       orderBy: {
  //         startAt: 'asc',
  //       },
  //     });

  //     // Transform slots and appointments into calendar events
  //     const events: CalendarEventDto[] = [];

  //     for (const slot of slots) {
  //       const doctor = slot.schedule.doctor;
  //       const doctorName = `${doctor.user.names} ${doctor.user.fatherSurname} ${doctor.user.motherSurname}`;
  //       const specialtyName = doctor.specialty.name;
  //       const clinicName = doctor.clinic.name;

  //       if (slot.appointment) {
  //         // This slot has an appointment
  //         const patientName = `${slot.appointment.user.names} ${slot.appointment.user.fatherSurname} ${slot.appointment.user.motherSurname}`;

  //         events.push({
  //           id: slot.appointment.id,
  //           startAt: slot.startAt,
  //           endAt: slot.endAt,
  //           type: 'appointment',
  //           status: slot.appointment.status,
  //           doctorId: doctor.id,
  //           doctorName,
  //           specialtyName,
  //           clinicName,
  //           patientName,
  //           reason: slot.appointment.reason,
  //           notes: slot.appointment.notes,
  //         });
  //       } else {
  //         // This is a free slot
  //         events.push({
  //           id: slot.id,
  //           startAt: slot.startAt,
  //           endAt: slot.endAt,
  //           type: 'slot',
  //           status: slot.status,
  //           doctorId: doctor.id,
  //           doctorName,
  //           specialtyName,
  //           clinicName,
  //         });
  //       }
  //     }

  //     return events;
  //   }

  //   async getAppointmentById(id: string): Promise<AppointmentEntity> {
  //     const appointment = await this.prisma.appointment.findUnique({
  //       where: { id },
  //     });

  //     if (!appointment) {
  //       throw new BadRequestException('Appointment not found');
  //     }

  //     return appointment;
  //   }

  //   async updateAppointmentStatus(
  //     id: string,
  //     status: AppointmentStatus,
  //   ): Promise<AppointmentEntity> {
  //     const updateData: any = { status };

  //     if (status === AppointmentStatus.CONFIRMED) {
  //       updateData.confirmedAt = new Date();
  //     } else if (status === AppointmentStatus.CANCELLED) {
  //       updateData.cancelledAt = new Date();
  //     } else if (status === AppointmentStatus.ATTENDED) {
  //       updateData.attendedAt = new Date();
  //     }

  //     return await this.prisma.appointment.update({
  //       where: { id },
  //       data: updateData,
  //     });
  //   }
}
