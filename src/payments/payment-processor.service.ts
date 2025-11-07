import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentSimulatorService } from './payment-simulator.service';
import { SimulatedCardDto } from './dto/simulated-card.dto';
import { PaymentStatus, AppointmentStatus, SlotStatus } from '@prisma/client';

export class PaymentFailedException extends HttpException {
  constructor(message: string, public readonly retryable: boolean = true) {
    super(
      {
        success: false,
        error: {
          code: 'PAYMENT_DECLINED',
          message,
          retryable,
        },
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

export class PaymentTimeoutException extends HttpException {
  constructor() {
    super(
      {
        success: false,
        error: {
          code: 'PAYMENT_TIMEOUT',
          message: 'El procesamiento del pago ha excedido el tiempo límite',
          retryable: true,
        },
      },
      HttpStatus.REQUEST_TIMEOUT,
    );
  }
}

@Injectable()
export class PaymentProcessorService {
  private readonly logger = new Logger(PaymentProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly simulator: PaymentSimulatorService,
  ) {}

  /**
   * Procesa un pago con tarjeta simulada
   * Implementa transacciones atómicas y manejo de estados
   */
  async processPayment(
    paymentId: string,
    cardData: SimulatedCardDto,
    userId: string,
    ipAddress: string,
  ): Promise<any> {
    const startTime = Date.now();

    // 1. Verificar que el payment existe y pertenece al usuario
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        appointment: {
          include: {
            slot: true,
            user: true,
            doctor: {
              include: {
                user: true,
                specialty: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (payment.appointment.userId !== userId) {
      throw new BadRequestException('Este pago no pertenece a tu cita');
    }

    // 2. Validar estado del payment
    if (payment.status === PaymentStatus.COMPLETED) {
      // Idempotencia: ya está completado, retornar datos existentes
      this.logger.log(
        `Payment ${paymentId} already completed. Returning existing data.`,
      );
      return {
        success: true,
        payment: {
          id: payment.id,
          transactionId: payment.transactionId,
          status: payment.status,
          amount: payment.amount,
          paidAt: payment.paidAt,
          processingTimeMs: payment.processingTimeMs,
        },
        appointment: {
          id: payment.appointment.id,
          status: payment.appointment.status,
        },
      };
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `El pago no está en estado PENDING (actual: ${payment.status})`,
      );
    }

    // 3. Validar expiración
    if (payment.expiresAt && new Date() > payment.expiresAt) {
      throw new HttpException(
        {
          statusCode: 410,
          error: 'Gone',
          message: 'El tiempo para completar el pago ha expirado',
          expiresAt: payment.expiresAt,
        },
        HttpStatus.GONE,
      );
    }

    // 4. Actualizar a PROCESSING
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PROCESSING,
        retryCount: { increment: 1 },
      },
    });

    // 5. Simular procesamiento con delays
    const scenario = this.simulator.selectRandomScenario();
    this.logger.log(
      `Processing payment ${paymentId} with scenario: ${scenario.result}, delay: ${scenario.delayMs}ms`,
    );

    await this.simulator.delay(scenario.delayMs);

    // 6. Ejecutar resultado en transacción atómica
    try {
      if (scenario.result === 'success') {
        return await this.handleSuccessfulPayment(
          payment,
          cardData,
          ipAddress,
          startTime,
        );
      } else if (scenario.result === 'failed') {
        return await this.handleFailedPayment(
          payment,
          scenario,
          startTime,
        );
      } else {
        // timeout
        return await this.handleTimeoutPayment(payment, startTime);
      }
    } catch (error) {
      this.logger.error(
        `Error processing payment ${paymentId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Maneja un pago exitoso (SUCCESS PATH)
   */
  private async handleSuccessfulPayment(
    payment: any,
    cardData: SimulatedCardDto,
    ipAddress: string,
    startTime: number,
  ): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      // Actualizar payment a COMPLETED
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
          processingTimeMs: Date.now() - startTime,
          metadata: {
            cardBrand: this.simulator.detectCardBrand(cardData.cardNumber),
            lastFourDigits: cardData.cardNumber.slice(-4),
            cardholderName: cardData.cardholderName,
            ipAddress,
            simulatedRiskScore: this.simulator.generateRiskScore(),
          },
          gatewayResponse: {
            code: '00',
            message: 'Approved',
            authorizationCode: this.simulator.generateAuthorizationCode(),
          },
        },
      });

      // Confirmar cita
      const updatedAppointment = await tx.appointment.update({
        where: { id: payment.appointmentId },
        data: {
          status: AppointmentStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });

      // Bloquear slot permanentemente
      await tx.slot.update({
        where: { id: payment.appointment.slotId },
        data: {
          status: SlotStatus.BOOKED,
          holdExpiresAt: null,
        },
      });

      // Encolar email de confirmación
      await tx.emailMessage.create({
        data: {
          to: payment.appointment.user.email,
          subject: 'Cita confirmada - Pago completado',
          template: 'BOOKING_CONFIRMATION',
          status: 'PENDING',
          variables: {
            patientName: `${payment.appointment.user.firstName} ${payment.appointment.user.lastName}`,
            doctorName: `${payment.appointment.doctor.user.firstName} ${payment.appointment.doctor.user.lastName}`,
            specialty: payment.appointment.doctor.specialty.name,
            appointmentDate: payment.appointment.slot.startAt.toISOString(),
            confirmedAt: new Date().toISOString(),
            amount: updatedPayment.amount.toString(),
            transactionId: updatedPayment.transactionId,
          },
        },
      });

      // Audit log
      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          action: 'payment_completed',
          status: PaymentStatus.COMPLETED,
          metadata: {
            userId: payment.appointment.userId,
            ipAddress,
            processingTimeMs: Date.now() - startTime,
          },
        },
      });

      this.logger.log(
        `Payment ${payment.id} completed successfully in ${Date.now() - startTime}ms`,
      );

      return {
        success: true,
        payment: {
          id: updatedPayment.id,
          transactionId: updatedPayment.transactionId,
          status: updatedPayment.status,
          amount: updatedPayment.amount,
          paidAt: updatedPayment.paidAt,
          processingTimeMs: updatedPayment.processingTimeMs,
        },
        appointment: {
          id: updatedAppointment.id,
          status: updatedAppointment.status,
        },
      };
    });
  }

  /**
   * Maneja un pago fallido (FAILURE PATH)
   */
  private async handleFailedPayment(
    payment: any,
    scenario: any,
    startTime: number,
  ): Promise<never> {
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          processingTimeMs: Date.now() - startTime,
          failureReason: scenario.reason,
          gatewayResponse: {
            code: scenario.errorCode,
            message: scenario.errorMessage,
          },
        },
      });

      // Audit log
      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          action: 'payment_failed',
          status: PaymentStatus.FAILED,
          metadata: {
            userId: payment.appointment.userId,
            failureReason: scenario.reason,
            retryCount: payment.retryCount + 1,
          },
        },
      });
    });

    this.logger.warn(
      `Payment ${payment.id} failed: ${scenario.reason}`,
    );

    throw new PaymentFailedException(scenario.errorMessage, true);
  }

  /**
   * Maneja un timeout (TIMEOUT PATH)
   */
  private async handleTimeoutPayment(
    payment: any,
    startTime: number,
  ): Promise<never> {
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          processingTimeMs: Date.now() - startTime,
          failureReason: 'gateway_timeout',
        },
      });

      // Audit log
      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          action: 'payment_timeout',
          status: PaymentStatus.FAILED,
          metadata: {
            userId: payment.appointment.userId,
            failureReason: 'gateway_timeout',
          },
        },
      });
    });

    this.logger.warn(`Payment ${payment.id} timed out`);

    throw new PaymentTimeoutException();
  }

  /**
   * Marca un pago en efectivo como completado (ADMIN only)
   */
  async markCashPaid(
    paymentId: string,
    adminUserId: string,
    notes?: string,
  ): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      // Verificar payment
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          appointment: {
            include: { slot: true },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Pago no encontrado');
      }

      if (payment.paymentMethod !== 'CASH_AT_CLINIC') {
        throw new BadRequestException(
          'Este pago no es de tipo efectivo en clínica',
        );
      }

      if (payment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException(
          `El pago no está en estado PENDING (actual: ${payment.status})`,
        );
      }

      // Actualizar payment
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          paidAt: new Date(),
          metadata: {
            paidBy: adminUserId,
            notes: notes || 'Pago en efectivo confirmado',
            paymentType: 'cash',
          },
        },
      });

      // Confirmar cita
      await tx.appointment.update({
        where: { id: payment.appointmentId },
        data: {
          status: AppointmentStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });

      // Bloquear slot
      await tx.slot.update({
        where: { id: payment.appointment.slotId },
        data: {
          status: SlotStatus.BOOKED,
          holdExpiresAt: null,
        },
      });

      // Audit log
      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          action: 'cash_payment_marked_completed',
          status: PaymentStatus.COMPLETED,
          metadata: {
            adminUserId,
            notes: notes || '',
          },
        },
      });

      this.logger.log(
        `Cash payment ${paymentId} marked as completed by admin ${adminUserId}`,
      );

      return updatedPayment;
    });
  }
}
