import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SlotStatus, AppointmentStatus, PaymentStatus } from '@prisma/client';

/**
 * Servicio de tareas programadas para mantenimiento del sistema
 * Ejecuta jobs periódicos para limpiar slots expirados, cancelar pagos pendientes, etc.
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Libera slots HELD cuyo holdExpiresAt ya pasó
   * Ejecuta cada 5 minutos
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async releaseExpiredHolds(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Starting releaseExpiredHolds job...');

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Encontrar slots HELD expirados
        const expiredSlots = await tx.slot.findMany({
          where: {
            status: SlotStatus.HELD,
            holdExpiresAt: { lt: new Date() },
          },
          select: { id: true },
        });

        if (expiredSlots.length === 0) {
          return {
            slotsReleased: 0,
            appointmentsCancelled: 0,
            paymentsFailed: 0,
          };
        }

        const slotIds = expiredSlots.map((s) => s.id);

        // 2. Actualizar slots a FREE
        const slotsUpdated = await tx.slot.updateMany({
          where: {
            id: { in: slotIds },
            status: SlotStatus.HELD,
          },
          data: {
            status: SlotStatus.FREE,
            holdExpiresAt: null,
          },
        });

        // 3. Cancelar appointments asociados que estén PENDING
        const appointmentsCancelled = await tx.appointment.updateMany({
          where: {
            slotId: { in: slotIds },
            status: AppointmentStatus.PENDING,
          },
          data: {
            status: AppointmentStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });

        // 4. Marcar pagos como FAILED
        const paymentsFailed = await tx.payment.updateMany({
          where: {
            appointment: {
              slotId: { in: slotIds },
            },
            status: PaymentStatus.PENDING,
          },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: 'payment_expired',
          },
        });

        return {
          slotsReleased: slotsUpdated.count,
          appointmentsCancelled: appointmentsCancelled.count,
          paymentsFailed: paymentsFailed.count,
        };
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `releaseExpiredHolds completed in ${duration}ms: ` +
          `${result.slotsReleased} slots released, ` +
          `${result.appointmentsCancelled} appointments cancelled, ` +
          `${result.paymentsFailed} payments marked as failed`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `releaseExpiredHolds failed: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Limpia pagos PENDING que expiraron hace más de 1 hora
   * Ejecuta cada hora para asegurar limpieza de edge cases
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupStalePayments(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Starting cleanupStalePayments job...');

    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const result = await this.prisma.payment.updateMany({
        where: {
          status: PaymentStatus.PENDING,
          expiresAt: { lt: oneHourAgo },
        },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: 'stale_payment_cleanup',
        },
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `cleanupStalePayments completed in ${duration}ms: ${result.count} stale payments cleaned`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `cleanupStalePayments failed: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Log de salud del sistema - cada 30 minutos
   * Útil para monitoreo en producción
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async systemHealthCheck(): Promise<void> {
    try {
      const [pendingPayments, heldSlots, pendingEmails] = await Promise.all([
        this.prisma.payment.count({
          where: { status: PaymentStatus.PENDING },
        }),
        this.prisma.slot.count({
          where: { status: SlotStatus.HELD },
        }),
        this.prisma.emailMessage.count({
          where: { status: 'PENDING' },
        }),
      ]);

      this.logger.log(
        `[HEALTH] Pending payments: ${pendingPayments}, ` +
          `Held slots: ${heldSlots}, ` +
          `Pending emails: ${pendingEmails}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`systemHealthCheck failed: ${err.message}`, err.stack);
    }
  }
}
