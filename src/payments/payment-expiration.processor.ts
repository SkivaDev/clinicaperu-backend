import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, AppointmentStatus, SlotStatus } from '@prisma/client';

@Injectable()
export class PaymentExpirationProcessor {
  private readonly logger = new Logger(PaymentExpirationProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * CRON Job: Expira pagos pendientes cada 5 minutos
   * Ejecuta la limpieza de pagos que han superado su tiempo de expiración
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expirePendingPayments() {
    this.logger.log('Running payment expiration job...');

    try {
      // Buscar pagos PENDING que han expirado
      const expiredPayments = await this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.PENDING,
          expiresAt: {
            lte: new Date(),
          },
        },
        include: {
          appointment: {
            include: {
              slot: true,
              user: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      if (expiredPayments.length === 0) {
        this.logger.log('No expired payments found');
        return;
      }

      this.logger.log(
        `Found ${expiredPayments.length} expired payments. Processing...`,
      );

      // Procesar cada pago expirado en una transacción
      let successCount = 0;
      let errorCount = 0;

      for (const payment of expiredPayments) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // 1. Expirar el pago
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.EXPIRED,
              },
            });

            // 2. Cancelar la cita
            await tx.appointment.update({
              where: { id: payment.appointmentId },
              data: {
                status: AppointmentStatus.CANCELLED,
                cancelledAt: new Date(),
                cancellationReason: 'Pago no completado a tiempo',
              },
            });

            // 3. Liberar el slot
            await tx.slot.update({
              where: { id: payment.appointment.slotId },
              data: {
                status: SlotStatus.FREE,
                holdExpiresAt: null,
              },
            });

            // 4. Crear audit log
            await tx.paymentAuditLog.create({
              data: {
                paymentId: payment.id,
                action: 'payment_expired',
                status: PaymentStatus.EXPIRED,
                metadata: {
                  expiresAt: payment.expiresAt,
                  appointmentId: payment.appointmentId,
                  slotId: payment.appointment.slotId,
                },
              },
            });

            // 5. Encolar email de notificación
            await tx.emailMessage.create({
              data: {
                to: payment.appointment.user.email,
                subject: 'Tu reserva ha expirado',
                template: 'BOOKING_CANCELLATION',
                status: 'PENDING',
                variables: {
                  patientName: `${payment.appointment.user.firstName} ${payment.appointment.user.lastName}`,
                  reason: 'El pago no fue completado a tiempo',
                  expiresAt: payment.expiresAt?.toISOString() || '',
                  amount: payment.amount.toString(),
                },
              },
            });
          });

          successCount++;
          this.logger.log(
            `Successfully expired payment ${payment.id} and freed slot ${payment.appointment.slotId}`,
          );
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Error expiring payment ${payment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      this.logger.log(
        `Payment expiration job completed. Success: ${successCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        `Critical error in payment expiration job: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Método manual para testing (no debe ser expuesto en producción)
   */
  async manualExpiration() {
    this.logger.warn('Manual payment expiration triggered');
    await this.expirePendingPayments();
  }
}
