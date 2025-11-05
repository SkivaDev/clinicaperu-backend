import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { AppointmentStatus, SlotStatus, Role } from '@prisma/client';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
// import { CreateAppointmentDto } from './dto/create-appointment.dto';
// import { CalendarQueryDto } from './dto/calendar-query.dto';
// import { CalendarEventDto } from './dto/calendar-event.dto';
// import { AppointmentEntity } from './entities/appointment.entity';
// import { SlotStatus, AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

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

  /**
   * Obtiene las citas del usuario autenticado según su rol
   * - PATIENT: Solo sus propias citas
   * - DOCTOR: Solo las citas de sus pacientes
   * - ADMIN: Todas las citas del sistema
   */
  async getMyAppointments(userId: string, userRole: Role): Promise<any[]> {
    let whereClause: any = {};

    if (userRole === Role.PATIENT) {
      // Paciente: solo sus propias citas
      whereClause = { userId };
    } else if (userRole === Role.DOCTOR) {
      // Doctor: obtener su doctorId y filtrar por sus citas
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!doctor) {
        throw new BadRequestException('Doctor profile not found');
      }

      whereClause = { doctorId: doctor.id };
    }
    // ADMIN: whereClause vacío = todas las citas

    const appointments = await this.prisma.appointment.findMany({
      where: whereClause,
      include: {
        slot: {
          select: {
            id: true,
            startAt: true,
            endAt: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        doctor: {
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
                address: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return appointments;
  }

  /**
   * Obtiene todas las citas del sistema (solo para ADMIN)
   * @deprecated Usar getMyAppointments con validación de rol
   */
  async getAllAppointments(): Promise<AppointmentResponseDto[]> {
    const appointments = await this.prisma.appointment.findMany({
      include: {
        slot: true,
      },
    });

    return appointments;
  }

  /**
   * HU-026: Cancelar una cita
   * Validaciones:
   * - Solo el paciente propietario, el doctor asignado o un admin pueden cancelar
   * - Pacientes solo pueden cancelar con >24h de anticipación
   * - Doctores y admins pueden cancelar sin restricción de tiempo
   */
  async cancelAppointment(
    appointmentId: string,
    userId: string,
    userRole: Role,
  ): Promise<AppointmentResponseDto> {
    this.logger.log(
      `User ${userId} (${userRole}) attempting to cancel appointment ${appointmentId}`,
    );

    return await this.prisma.$transaction(async (tx) => {
      // 1. Obtener la cita con todas las relaciones necesarias
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          slot: true,
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          doctor: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
              specialty: { select: { name: true } },
            },
          },
        },
      });

      if (!appointment) {
        throw new NotFoundException('Cita no encontrada');
      }

      // 2. Validar que la cita no esté ya cancelada
      if (appointment.status === AppointmentStatus.CANCELLED) {
        throw new BadRequestException('La cita ya está cancelada');
      }

      // 3. Validar que la cita no esté ya atendida
      if (appointment.status === AppointmentStatus.ATTENDED) {
        throw new BadRequestException(
          'No se puede cancelar una cita ya atendida',
        );
      }

      // 4. Validar ownership: el usuario debe ser el paciente, el doctor o un admin
      const isDoctorOwner = appointment.doctor.userId === userId;
      const isPatientOwner = appointment.userId === userId;
      const isAdmin = userRole === Role.ADMIN;

      if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
        throw new ForbiddenException(
          'No tienes permisos para cancelar esta cita',
        );
      }

      // 5. Validación de política de 24 horas (solo para pacientes)
      if (isPatientOwner && userRole === Role.PATIENT) {
        const now = new Date();
        const appointmentStart = new Date(appointment.slot.startAt);
        const hoursUntilAppointment =
          (appointmentStart.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilAppointment < 24) {
          throw new BadRequestException(
            'No se puede cancelar citas con menos de 24 horas de anticipación. Por favor, contacta con la clínica.',
          );
        }
      }

      // 6. Actualizar el estado de la cita a CANCELLED
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      // 7. Liberar el slot (cambiar status a FREE)
      await tx.slot.update({
        where: { id: appointment.slotId },
        data: {
          status: SlotStatus.FREE,
        },
      });

      // 8. Encolar email de notificación de cancelación
      await tx.emailMessage.create({
        data: {
          to: appointment.user.email,
          subject: 'Cita cancelada',
          template: 'BOOKING_CANCELLATION',
          status: 'PENDING',
          variables: {
            patientName: `${appointment.user.firstName} ${appointment.user.lastName}`,
            doctorName: `${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`,
            specialty: appointment.doctor.specialty.name,
            appointmentDate: appointment.slot.startAt.toISOString(),
            cancelledAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(
        `Appointment ${appointmentId} cancelled successfully by user ${userId} (${userRole})`,
      );

      return updatedAppointment;
    });
  }

  /**
   * HU-026: Reprogramar una cita
   * Validaciones:
   * - Solo el paciente propietario puede reprogramar
   * - Solo se puede reprogramar con >24h de anticipación
   * - El nuevo slot debe estar FREE
   * - El nuevo slot debe pertenecer al mismo doctor
   */
  async rescheduleAppointment(
    appointmentId: string,
    userId: string,
    userRole: Role,
    dto: RescheduleAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    this.logger.log(
      `User ${userId} attempting to reschedule appointment ${appointmentId} to slot ${dto.newSlotId}`,
    );

    return await this.prisma.$transaction(async (tx) => {
      // 1. Obtener la cita actual con todas las relaciones
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          slot: true,
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          doctor: {
            include: {
              user: { select: { firstName: true, lastName: true } },
              specialty: { select: { name: true } },
            },
          },
        },
      });

      if (!appointment) {
        throw new NotFoundException('Cita no encontrada');
      }

      // 2. Validar que la cita no esté cancelada o atendida
      if (appointment.status === AppointmentStatus.CANCELLED) {
        throw new BadRequestException(
          'No se puede reprogramar una cita cancelada',
        );
      }

      if (appointment.status === AppointmentStatus.ATTENDED) {
        throw new BadRequestException(
          'No se puede reprogramar una cita ya atendida',
        );
      }

      // 3. Validar ownership: solo el paciente o un admin pueden reprogramar
      const isPatientOwner = appointment.userId === userId;
      const isAdmin = userRole === Role.ADMIN;

      if (!isPatientOwner && !isAdmin) {
        throw new ForbiddenException(
          'Solo el paciente puede reprogramar su cita',
        );
      }

      // 4. Validación de política de 24 horas
      const now = new Date();
      const currentAppointmentStart = new Date(appointment.slot.startAt);
      const hoursUntilAppointment =
        (currentAppointmentStart.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilAppointment < 24) {
        throw new BadRequestException(
          'No se puede reprogramar citas con menos de 24 horas de anticipación',
        );
      }

      // 5. Validar que el slot nuevo exista y esté disponible (con lock)
      const newSlots = await tx.$queryRaw<any[]>`
        SELECT * FROM "Slot" 
        WHERE id = ${dto.newSlotId}
        FOR UPDATE NOWAIT
      `;

      if (!newSlots || newSlots.length === 0) {
        throw new NotFoundException('El nuevo slot no existe');
      }

      const newSlot = newSlots[0];

      if (newSlot.status !== SlotStatus.FREE) {
        throw new ConflictException(
          'El nuevo slot no está disponible para reserva',
        );
      }

      if (!newSlot.isActive) {
        throw new BadRequestException('El nuevo slot no está activo');
      }

      // 6. Validar que la fecha del nuevo slot sea futura
      const newSlotStart = new Date(newSlot.startAt);
      if (newSlotStart <= now) {
        throw new BadRequestException(
          'No se puede reservar slots en el pasado',
        );
      }

      // 7. Obtener el schedule del nuevo slot para verificar el doctor
      const newSlotWithSchedule = await tx.slot.findUnique({
        where: { id: dto.newSlotId },
        include: {
          schedule: {
            select: {
              doctorId: true,
            },
          },
        },
      });

      if (!newSlotWithSchedule) {
        throw new NotFoundException('El nuevo slot no existe');
      }

      // 8. Validar que el nuevo slot pertenezca al mismo doctor
      if (newSlotWithSchedule.schedule.doctorId !== appointment.doctorId) {
        throw new BadRequestException(
          'El nuevo slot debe pertenecer al mismo doctor',
        );
      }

      // 9. Liberar el slot antiguo
      await tx.slot.update({
        where: { id: appointment.slotId },
        data: {
          status: SlotStatus.FREE,
        },
      });

      // 10. Reservar el nuevo slot
      await tx.slot.update({
        where: { id: dto.newSlotId },
        data: {
          status: SlotStatus.BOOKED,
        },
      });

      // 11. Actualizar la cita con el nuevo slotId y cambiar estado dependiendo del rol
      if (userRole === 'PATIENT') {
        appointment.status = 'CONFIRMED';
      } else {
        appointment.status = 'PENDING';
      }
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          slotId: dto.newSlotId,
          status: appointment.status,
          updatedAt: new Date(),
        },
      });

      // 12. Encolar email de notificación de reprogramación
      await tx.emailMessage.create({
        data: {
          to: appointment.user.email,
          subject: 'Cita reprogramada',
          template: 'BOOKING_CONFIRMATION', // Reutilizamos el template
          status: 'PENDING',
          variables: {
            patientName: `${appointment.user.firstName} ${appointment.user.lastName}`,
            doctorName: `${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`,
            specialty: appointment.doctor.specialty.name,
            oldAppointmentDate: appointment.slot.startAt.toISOString(),
            newAppointmentDate: newSlot.startAt,
            rescheduledAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(
        `Appointment ${appointmentId} rescheduled successfully from slot ${appointment.slotId} to ${dto.newSlotId}`,
      );

      return updatedAppointment;
    });
  }

  /**
   * Confirma una cita que está en estado PENDING
   * Solo el paciente propietario puede confirmar su cita
   * Cambia el estado de PENDING a CONFIRMED y establece confirmedAt
   * Esto es en el caso de que el doctor agende una cita para el paciente y el paciente necesite confirmar.
   */
  async confirmAppointment(
    appointmentId: string,
    userId: string,
    userRole: Role,
  ): Promise<AppointmentResponseDto> {
    this.logger.log(
      `User ${userId} (${userRole}) attempting to confirm appointment ${appointmentId}`,
    );

    return await this.prisma.$transaction(async (tx) => {
      // 1. Obtener la cita con todas las relaciones necesarias
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          slot: true,
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          doctor: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
              specialty: { select: { name: true } },
            },
          },
        },
      });

      if (!appointment) {
        throw new NotFoundException('Cita no encontrada');
      }

      // 2. Validar que la cita esté en estado PENDING
      if (appointment.status !== AppointmentStatus.PENDING) {
        throw new BadRequestException(
          `No se puede confirmar una cita con estado ${appointment.status}. Solo se pueden confirmar citas en estado PENDING.`,
        );
      }

      // 3. Validar ownership: solo el paciente propietario puede confirmar
      const isPatientOwner = appointment.userId === userId;
      const isAdmin = userRole === Role.ADMIN;

      if (!isPatientOwner && !isAdmin) {
        throw new ForbiddenException(
          'Solo el paciente propietario puede confirmar esta cita',
        );
      }

      // 4. Actualizar el estado de la cita a CONFIRMED
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });

      // 5. Encolar email de confirmación al paciente
      await tx.emailMessage.create({
        data: {
          to: appointment.user.email,
          subject: 'Cita confirmada',
          template: 'BOOKING_CONFIRMATION',
          status: 'PENDING',
          variables: {
            patientName: `${appointment.user.firstName} ${appointment.user.lastName}`,
            doctorName: `${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`,
            specialty: appointment.doctor.specialty.name,
            appointmentDate: appointment.slot.startAt.toISOString(),
            confirmedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(
        `Appointment ${appointmentId} confirmed successfully by user ${userId} (${userRole})`,
      );

      return updatedAppointment;
    });
  }

  /**
   * Marca una cita como atendida (ATTENDED)
   * Solo el doctor asignado o un admin puede marcar asistencia
   * Cambia el estado de CONFIRMED a ATTENDED y establece attendedAt
   */
  async markAsAttended(
    appointmentId: string,
    userId: string,
    userRole: Role,
  ): Promise<AppointmentResponseDto> {
    this.logger.log(
      `User ${userId} (${userRole}) attempting to mark appointment ${appointmentId} as attended`,
    );

    return await this.prisma.$transaction(async (tx) => {
      // 1. Obtener la cita con todas las relaciones necesarias
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          slot: true,
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          doctor: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
              specialty: { select: { name: true } },
            },
          },
        },
      });

      if (!appointment) {
        throw new NotFoundException('Cita no encontrada');
      }

      // 2. Validar que la cita esté en estado CONFIRMED
      if (appointment.status !== AppointmentStatus.CONFIRMED) {
        throw new BadRequestException(
          `No se puede marcar como atendida una cita con estado ${appointment.status}. Solo se pueden marcar citas CONFIRMED como atendidas.`,
        );
      }

      // 3. Validar que la cita sea del día actual o pasada (no futura)
      const now = new Date();
      const appointmentStart = new Date(appointment.slot.startAt);

      if (appointmentStart > now) {
        throw new BadRequestException(
          'No se puede marcar como atendida una cita futura. Solo citas del día actual o pasadas pueden marcarse como atendidas.',
        );
      }

      // 4. Validar ownership: solo el doctor asignado o un admin puede marcar asistencia
      const isDoctorOwner = appointment.doctor.userId === userId;
      const isAdmin = userRole === Role.ADMIN;

      if (!isDoctorOwner && !isAdmin) {
        throw new ForbiddenException(
          'Solo el doctor asignado puede marcar esta cita como atendida',
        );
      }

      // 5. Actualizar el estado de la cita a ATTENDED
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.ATTENDED,
          attendedAt: new Date(),
        },
      });

      this.logger.log(
        `Appointment ${appointmentId} marked as attended successfully by user ${userId} (${userRole})`,
      );

      return updatedAppointment;
    });
  }
}
