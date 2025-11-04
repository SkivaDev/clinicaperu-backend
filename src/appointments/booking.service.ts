// src/appointments/booking.service.ts
import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { SlotStatus, AppointmentStatus } from '@prisma/client';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly TRANSACTION_TIMEOUT = 5000; // 5 segundos
  private readonly MAX_RETRIES = 1; // Retry 1 vez en caso de deadlock
  private readonly RETRY_DELAY = 100; // 100ms backoff

  constructor(private readonly prisma: PrismaService) {}

  /**
   * HU-023: Atomic Booking - Reserva un slot de forma atómica (Patient o Admin)
   * Garantiza que solo un paciente pueda reservar un slot específico
   * Maneja concurrencia con FOR UPDATE y retry en deadlocks
   *
   * Estado inicial:
   * - PATIENT: CONFIRMED (auto-confirmación)
   * - ADMIN: CONFIRMED (auto-confirmación)
   */
  async bookSlot(
    userId: string,
    bookingDto: BookAppointmentDto,
    userRole: 'PATIENT' | 'ADMIN',
    requestId?: string,
  ): Promise<BookingResponseDto> {
    const logContext = requestId ? `[${requestId}]` : '';
    this.logger.log(
      `${logContext} Starting atomic booking for user ${userId} (${userRole}), slot ${bookingDto.slotId}`,
    );

    // Paciente o Admin crean citas CONFIRMED automáticamente
    const initialStatus = AppointmentStatus.CONFIRMED;
    const shouldSetConfirmedAt = true;

    let attempt = 0;

    while (attempt <= this.MAX_RETRIES) {
      try {
        const result = await this.executeBookingTransaction(
          userId,
          bookingDto,
          initialStatus,
          shouldSetConfirmedAt,
          requestId,
        );
        this.logger.log(
          `${logContext} Booking completed successfully: appointment ${result.id} with status ${initialStatus}`,
        );
        return result;
      } catch (error) {

        // Si es un deadlock, reintentar
        if (this.isDeadlockError(error) && attempt < this.MAX_RETRIES) {
          attempt++;
          this.logger.warn(
            `${logContext} Deadlock detected, retrying (attempt ${attempt}/${this.MAX_RETRIES})`,
          );
          await this.sleep(this.RETRY_DELAY * attempt); // Backoff exponencial
          continue;
        }

        // Si no es deadlock o ya se agotaron los reintentos, lanzar error
        throw error;
      }
    }

    // Si llegamos aquí, se agotaron los reintentos
    this.logger.error(
      `${logContext} Booking failed after ${this.MAX_RETRIES} retries`,
    );
    throw new InternalServerErrorException(
      'Booking failed due to high concurrency. Please try again.',
    );
  }

  /**
   * HU-024: Doctor Books for Patient - Doctor reserva slot para un paciente
   * Reutiliza la misma lógica transaccional que HU-023
   * Validación adicional: el slot debe pertenecer al doctor
   *
   * Estado inicial: PENDING (el paciente debe confirmar)
   */
  async bookSlotForPatient(
    patientId: string,
    slotId: string,
    reason: string,
    notes: string | undefined,
    requestId?: string,
  ): Promise<BookingResponseDto> {
    const logContext = requestId ? `[${requestId}]` : '';
    this.logger.log(
      `${logContext} Doctor booking slot ${slotId} for patient ${patientId}`,
    );

    // Doctor crea citas PENDING - el paciente debe confirmar
    const initialStatus = AppointmentStatus.PENDING;
    const shouldSetConfirmedAt = false;

    // Reutilizar la misma lógica de booking
    const bookingDto: BookAppointmentDto = {
      slotId,
      reason,
      notes,
    };

    let attempt = 0;

    while (attempt <= this.MAX_RETRIES) {
      try {
        const result = await this.executeBookingTransaction(
          patientId,
          bookingDto,
          initialStatus,
          shouldSetConfirmedAt,
          requestId,
        );
        this.logger.log(
          `${logContext} Doctor booking completed successfully: appointment ${result.id} with status ${initialStatus}`,
        );
        return result;
      } catch (error) {

        // Si es un deadlock, reintentar
        if (this.isDeadlockError(error) && attempt < this.MAX_RETRIES) {
          attempt++;
          this.logger.warn(
            `${logContext} Deadlock detected, retrying (attempt ${attempt}/${this.MAX_RETRIES})`,
          );
          await this.sleep(this.RETRY_DELAY * attempt);
          continue;
        }

        throw error;
      }
    }

    this.logger.error(
      `${logContext} Doctor booking failed after ${this.MAX_RETRIES} retries`,
    );
    throw new InternalServerErrorException(
      'Booking failed due to high concurrency. Please try again.',
    );
  }

  /**
   * Ejecuta la transacción de booking con todas las validaciones
   * @param initialStatus Estado inicial de la cita (CONFIRMED para paciente/admin, PENDING para doctor)
   * @param shouldSetConfirmedAt Si debe establecer confirmedAt al crear la cita
   */
  private async executeBookingTransaction(
    patientId: string,
    bookingDto: BookAppointmentDto,
    initialStatus: AppointmentStatus,
    shouldSetConfirmedAt: boolean,
    requestId?: string,
  ): Promise<BookingResponseDto> {
    const logContext = requestId ? `[${requestId}]` : '';
    const startTime = Date.now();

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          // 1. SELECT FOR UPDATE NOWAIT - Lock pesimista del slot
          // Usamos queryRaw para tener control total del lock con JOIN para obtener doctorId
          const slots = await tx.$queryRaw<any[]>`
            SELECT s.*, sc."doctorId" as "doctorId"
            FROM "Slot" s
            INNER JOIN "Schedule" sc ON s."scheduleId" = sc.id
            WHERE s.id = ${bookingDto.slotId}
            FOR UPDATE OF s NOWAIT
          `;

          if (!slots || slots.length === 0) {
            throw new BadRequestException('Slot not found');
          }

          const slot = slots[0];

          // 2. Validaciones de negocio
          this.validateSlot(slot, logContext);

          // 3. Validar límite de citas del paciente (opcional)
          await this.validatePatientLimit(tx, patientId, slot.doctorId, logContext);

          // 4. Obtener información del doctor para la respuesta
          const doctor = await tx.doctor.findUnique({
            where: { id: slot.doctorId },
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
          });

          if (!doctor) {
            throw new BadRequestException('Doctor not found');
          }

          // 5. Crear la cita con el estado inicial apropiado
          const appointmentData: any = {
            userId: patientId,
            doctorId: slot.doctorId,
            slotId: bookingDto.slotId,
            reason: bookingDto.reason,
            notes: bookingDto.notes,
            status: initialStatus,
          };

          // Si es CONFIRMED, establecer confirmedAt
          if (
            shouldSetConfirmedAt &&
            initialStatus === AppointmentStatus.CONFIRMED
          ) {
            appointmentData.confirmedAt = new Date();
          }

          const appointment = await tx.appointment.create({
            data: appointmentData,
          });

          // 6. Actualizar el slot a BOOKED
          await tx.slot.update({
            where: { id: bookingDto.slotId },
            data: {
              status: SlotStatus.BOOKED,
            },
          });

          // 7. Obtener información del paciente para el email
          const patient = await tx.user.findUnique({
            where: { id: patientId },
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          });

          // 8. Encolar email según el estado de la cita
          await this.enqueueConfirmationEmail(
            tx,
            appointment.id,
            appointment.status,
            patient?.email || '',
            patient?.firstName || '',
            patient?.lastName || '',
            doctor.user.firstName,
            doctor.user.lastName,
            doctor.specialty.name,
            slot.startAt,
            logContext,
          );

          // 9. Registrar en audit log
          await this.logBookingAudit(
            tx,
            appointment.id,
            patientId,
            bookingDto.slotId,
            requestId,
          );

          const duration = Date.now() - startTime;
          this.logger.log(
            `${logContext} Transaction completed in ${duration}ms`,
          );

          // Construir respuesta
          return {
            id: appointment.id,
            slotId: appointment.slotId,
            userId: appointment.userId,
            doctorId: appointment.doctorId,
            startAt: slot.startAt,
            endAt: slot.endAt,
            status: appointment.status,
            reason: appointment.reason || bookingDto.reason,
            notes: appointment.notes || undefined,
            createdAt: appointment.createdAt,
            doctor: {
              id: doctor.id,
              name: `${doctor.user.firstName} ${doctor.user.lastName}`,
              specialty: doctor.specialty.name,
            },
            clinic: {
              id: doctor.clinic.id,
              name: doctor.clinic.name,
            },
          };
        },
        {
          maxWait: this.TRANSACTION_TIMEOUT,
          timeout: this.TRANSACTION_TIMEOUT,
          isolationLevel: 'Serializable', // Máximo nivel de aislamiento
        },
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `${logContext} Transaction failed after ${duration}ms: ${error.message}`,
      );

      // Transformar errores de Prisma a errores HTTP apropiados
      if (error.code === 'P2034') {
        // Lock timeout o NOWAIT failed
        throw new ConflictException(
          'Slot is currently being booked by another user. Please try again.',
        );
      }

      throw error;
    }
  }

  /**
   * Valida que el slot cumpla con todos los requisitos
   */
  private validateSlot(slot: any, logContext: string): void {
    // Validar que el slot esté FREE
    if (slot.status !== SlotStatus.FREE) {
      this.logger.warn(
        `${logContext} Slot ${slot.id} is not available (status: ${slot.status})`,
      );
      throw new ConflictException('Slot is not available for booking');
    }

    // Validar que el slot esté activo
    if (!slot.isActive) {
      this.logger.warn(`${logContext} Slot ${slot.id} is not active`);
      throw new BadRequestException('Slot is not active');
    }

    // Validar que la fecha sea futura
    const now = new Date();
    const slotStart = new Date(slot.startAt);
    if (slotStart <= now) {
      this.logger.warn(
        `${logContext} Slot ${slot.id} is in the past (${slotStart})`,
      );
      throw new BadRequestException('Cannot book slots in the past');
    }

    // Validar holdExpiresAt si existe
    if (slot.holdExpiresAt) {
      const holdExpires = new Date(slot.holdExpiresAt);
      if (holdExpires < now) {
        this.logger.warn(`${logContext} Slot ${slot.id} hold has expired`);
        throw new BadRequestException('Slot hold has expired');
      }
    }
  }

  /**
   * Valida que el paciente no exceda el límite de citas
   * Por ejemplo: máximo 5 citas pendientes por doctor
   */
  private async validatePatientLimit(
    tx: any,
    userId: string,
    doctorId: string,
    logContext: string,
  ): Promise<void> {
    const MAX_PENDING_APPOINTMENTS = 5;

    const pendingCount = await tx.appointment.count({
      where: {
        userId,
        doctorId,
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        },
      },
    });

    if (pendingCount >= MAX_PENDING_APPOINTMENTS) {
      this.logger.warn(
        `${logContext} User ${userId} has reached appointment limit (${pendingCount}/${MAX_PENDING_APPOINTMENTS})`,
      );
      throw new ConflictException(
        `You have reached the maximum number of pending appointments with this doctor (${MAX_PENDING_APPOINTMENTS})`,
      );
    }
  }

  /**
   * Encola un email según el estado de la cita
   * - CONFIRMED: Email de confirmación inmediata
   * - PENDING: Email pidiendo confirmación al paciente
   */
  private async enqueueConfirmationEmail(
    tx: any,
    appointmentId: string,
    appointmentStatus: AppointmentStatus,
    patientEmail: string,
    patientFirstName: string,
    patientLastName: string,
    doctorFirstName: string,
    doctorLastName: string,
    specialtyName: string,
    appointmentDate: Date,
    logContext: string,
  ): Promise<void> {
    try {
      if (appointmentStatus === AppointmentStatus.CONFIRMED) {
        // Email de confirmación inmediata (paciente/admin creó la cita)
        this.logger.log(
          `${logContext} Enqueuing confirmation email for appointment ${appointmentId} (CONFIRMED)`,
        );

        await tx.emailMessage.create({
          data: {
            to: patientEmail,
            subject: 'Cita confirmada',
            template: 'BOOKING_CONFIRMATION',
            status: 'PENDING',
            variables: {
              patientName: `${patientFirstName} ${patientLastName}`,
              doctorName: `${doctorFirstName} ${doctorLastName}`,
              specialty: specialtyName,
              appointmentDate: appointmentDate.toISOString(),
              confirmedAt: new Date().toISOString(),
            },
          },
        });
      } else if (appointmentStatus === AppointmentStatus.PENDING) {
        // Email pidiendo confirmación (doctor creó la cita)
        this.logger.log(
          `${logContext} Enqueuing confirmation request email for appointment ${appointmentId} (PENDING)`,
        );

        await tx.emailMessage.create({
          data: {
            to: patientEmail,
            subject: 'Confirma tu cita médica',
            template: 'BOOKING_CONFIRMATION', // Podríamos crear un template específico para PENDING
            status: 'PENDING',
            variables: {
              patientName: `${patientFirstName} ${patientLastName}`,
              doctorName: `${doctorFirstName} ${doctorLastName}`,
              specialty: specialtyName,
              appointmentDate: appointmentDate.toISOString(),
              requiresConfirmation: true,
            },
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `${logContext} Failed to enqueue confirmation email: ${error.message}`,
      );
      // No lanzamos error para no fallar la transacción por un email
    }
  }

  /**
   * Registra la operación de booking en audit log
   */
  private async logBookingAudit(
    tx: any,
    appointmentId: string,
    userId: string,
    slotId: string,
    requestId?: string,
  ): Promise<void> {
    try {
      // En producción, esto debería ir a una tabla de AuditLog
      this.logger.log(
        `[AUDIT] Booking created - Appointment: ${appointmentId}, User: ${userId}, Slot: ${slotId}, RequestId: ${requestId || 'N/A'}`,
      );

      // Aquí iría la inserción en tabla de audit
      // await tx.auditLog.create({ ... });
    } catch (error) {
      this.logger.error(`Failed to log audit: ${error.message}`);
      // No lanzamos error para no fallar la transacción
    }
  }

  /**
   * Detecta si un error es un deadlock
   */
  private isDeadlockError(error: any): boolean {
    // Códigos de error de PostgreSQL para deadlock
    const deadlockCodes = ['40P01', '40001', 'P2034'];
    return (
      error.code && deadlockCodes.includes(error.code) ||
      error.message?.includes('deadlock') ||
      error.message?.includes('could not obtain lock')
    );
  }

  /**
   * Utilidad para sleep con Promise
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
