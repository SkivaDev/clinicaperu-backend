import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProcessorService } from './payment-processor.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { MarkCashPaidDto } from './dto/mark-cash-paid.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentHistoryQueryDto } from './dto/payment-history-query.dto';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processor: PaymentProcessorService,
  ) {}

  /**
   * Procesa un pago con tarjeta simulada
   */
  async processPayment(
    paymentId: string,
    dto: ProcessPaymentDto,
    userId: string,
    ipAddress: string,
  ) {
    return await this.processor.processPayment(
      paymentId,
      dto.simulatedCardData,
      userId,
      ipAddress,
    );
  }

  /**
   * Marca un pago en efectivo como completado (ADMIN only)
   */
  async markCashPaid(
    paymentId: string,
    dto: MarkCashPaidDto,
    adminUserId: string,
  ) {
    return await this.processor.markCashPaid(
      paymentId,
      adminUserId,
      dto.notes,
    );
  }

  /**
   * Obtiene el historial de pagos del usuario
   */
  async getPaymentHistory(userId: string, query: PaymentHistoryQueryDto) {
    const { page = 1, limit = 20, status, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {
      appointment: {
        userId,
      },
    };

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Ejecutar query con paginación
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          appointment: {
            include: {
              slot: {
                select: {
                  startAt: true,
                },
              },
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
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments.map((payment) => ({
        id: payment.id,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
        appointment: {
          id: payment.appointment.id,
          slot: {
            startAt: payment.appointment.slot.startAt,
          },
          doctor: {
            firstName: payment.appointment.doctor.user.firstName,
            lastName: payment.appointment.doctor.user.lastName,
            specialty: {
              name: payment.appointment.doctor.specialty.name,
            },
          },
        },
        metadata: payment.metadata,
      })),
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Solicita un reembolso para un pago completado
   */
  async requestRefund(
    paymentId: string,
    dto: RefundPaymentDto,
    userId: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Obtener payment con appointment
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          appointment: {
            include: {
              slot: true,
              user: true,
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Pago no encontrado');
      }

      // Validar ownership
      if (payment.appointment.userId !== userId) {
        throw new BadRequestException('Este pago no te pertenece');
      }

      // Validar estado del payment
      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestException(
          'Solo se pueden reembolsar pagos completados',
        );
      }

      // Validar que no esté ya reembolsado
      if (payment.refundedAt) {
        throw new BadRequestException('Este pago ya ha sido reembolsado');
      }

      // Validar que la cita esté cancelada
      if (payment.appointment.status !== 'CANCELLED') {
        throw new BadRequestException(
          'La cita debe estar cancelada para solicitar reembolso',
        );
      }

      // Validar tiempo de cancelación (>24h antes de la cita)
      if (!payment.appointment.cancelledAt) {
        throw new BadRequestException('La cita no tiene fecha de cancelación');
      }

      const hoursBeforeAppointment =
        (payment.appointment.slot.startAt.getTime() -
          payment.appointment.cancelledAt.getTime()) /
        3600000;

      if (hoursBeforeAppointment < 24) {
        throw new BadRequestException(
          'El reembolso solo está disponible si cancelas con al menos 24 horas de anticipación',
        );
      }

      // Procesar reembolso
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
          refundedAt: new Date(),
          refundAmount: payment.amount,
          refundReason: dto.reason,
        },
      });

      // Audit log
      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          action: 'refund_requested',
          status: PaymentStatus.REFUNDED,
          metadata: {
            userId,
            reason: dto.reason,
            hoursBeforeAppointment,
          },
        },
      });

      // Encolar email de notificación
      await tx.emailMessage.create({
        data: {
          to: payment.appointment.user.email,
          subject: 'Reembolso procesado',
          template: 'BOOKING_CONFIRMATION',
          status: 'PENDING',
          variables: {
            patientName: `${payment.appointment.user.firstName} ${payment.appointment.user.lastName}`,
            amount: updatedPayment.amount.toString(),
            transactionId: updatedPayment.transactionId,
            refundReason: dto.reason,
          },
        },
      });

      this.logger.log(`Refund processed for payment ${paymentId}`);

      return {
        refundId: updatedPayment.id,
        amount: updatedPayment.amount,
        status: updatedPayment.status,
        refundedAt: updatedPayment.refundedAt,
        estimatedReturnDays: '5-7 días hábiles',
      };
    });
  }

  /**
   * Obtiene pagos en efectivo pendientes (ADMIN only)
   */
  async getPendingCashPayments() {
    return await this.prisma.payment.findMany({
      where: {
        paymentMethod: 'CASH_AT_CLINIC',
        status: PaymentStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        appointment: {
          include: {
            slot: {
              select: {
                startAt: true,
              },
            },
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            doctor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Obtiene un payment por ID
   */
  async findOne(paymentId: string, userId?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        appointment: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    // Si se proporciona userId, validar ownership
    if (userId && payment.appointment.userId !== userId) {
      throw new BadRequestException('Este pago no te pertenece');
    }

    return payment;
  }
}
