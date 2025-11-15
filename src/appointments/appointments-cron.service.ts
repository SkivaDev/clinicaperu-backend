import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsCronService {
  private readonly logger = new Logger(AppointmentsCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cron job that runs daily at 1:00 AM
   * Processes CONFIRMED appointments from the previous day that weren't attended
   * Marks them as NO_SHOW
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'daily-no-show-processing',
    timeZone: 'America/Lima',
  })
  async handleDailyNoShowProcessing() {
    this.logger.log('Starting daily no-show processing cron job...');

    const startTime = Date.now();

    try {
      // Calculate yesterday's date range (from start of yesterday to end of yesterday)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      this.logger.log(
        `Processing appointments from ${yesterday.toISOString()} to ${yesterdayEnd.toISOString()}`,
      );

      // Find all CONFIRMED appointments from yesterday that haven't been marked as attended
      const confirmedAppointmentsFromYesterday =
        await this.prisma.appointment.findMany({
          where: {
            status: AppointmentStatus.CONFIRMED,
            slot: {
              startAt: {
                gte: yesterday,
                lte: yesterdayEnd,
              },
            },
          },
          include: {
            slot: true,
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
            doctor: {
              include: {
                user: { select: { firstName: true, lastName: true } },
                specialty: { select: { name: true } },
              },
            },
          },
        });

      this.logger.log(
        `Found ${confirmedAppointmentsFromYesterday.length} CONFIRMED appointments from yesterday to process`,
      );

      let processedCount = 0;
      let errorCount = 0;

      // Process each appointment
      for (const appointment of confirmedAppointmentsFromYesterday) {
        try {
          // Double-check that the appointment hasn't been updated since our query
          // This prevents race conditions if a doctor marks it as attended right after our query
          const currentAppointment = await this.prisma.appointment.findUnique({
            where: { id: appointment.id },
            select: { status: true },
          });

          if (currentAppointment?.status === AppointmentStatus.CONFIRMED) {
            // Mark as NO_SHOW
            await this.prisma.appointment.update({
              where: { id: appointment.id },
              data: {
                status: AppointmentStatus.NO_SHOW,
                // Note: We don't set a timestamp for NO_SHOW as it's not in the schema
                // If needed, we could add a noShowAt field to track when it was marked
              },
            });

            this.logger.debug(
              `Marked appointment ${appointment.id} (${appointment.user.firstName} ${appointment.user.lastName} with ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}) as NO_SHOW`,
            );

            processedCount++;
          } else {
            this.logger.debug(
              `Skipping appointment ${appointment.id} - status changed to ${currentAppointment?.status}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error processing appointment ${appointment.id}: ${(error as Error).message}`,
          );
          errorCount++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Daily no-show processing completed: ${processedCount} appointments marked as NO_SHOW, ${errorCount} errors, took ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Fatal error in daily no-show processing: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Optional: Hourly check for same-day appointments that are now past
   * Runs every hour
   * Useful for clinics that want to mark no-shows during the day
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'hourly-no-show-check',
    timeZone: 'America/Lima',
  })
  async handleHourlyNoShowCheck() {
    this.logger.debug('Starting hourly no-show check...');

    try {
      // Get current time
      const now = new Date();

      // Find CONFIRMED appointments that started more than 30 minutes ago but are still CONFIRMED
      // This gives a 30-minute grace period after the appointment time
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      const pastAppointments = await this.prisma.appointment.findMany({
        where: {
          status: AppointmentStatus.CONFIRMED,
          slot: {
            startAt: {
              lt: thirtyMinutesAgo, // Appointment started more than 30 minutes ago
            },
          },
        },
        select: {
          id: true,
          user: {
            select: { firstName: true, lastName: true },
          },
          doctor: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      let processedCount = 0;

      for (const appointment of pastAppointments) {
        try {
          // Double-check current status
          const currentAppointment = await this.prisma.appointment.findUnique({
            where: { id: appointment.id },
            select: { status: true },
          });

          if (currentAppointment?.status === AppointmentStatus.CONFIRMED) {
            await this.prisma.appointment.update({
              where: { id: appointment.id },
              data: {
                status: AppointmentStatus.NO_SHOW,
              },
            });

            this.logger.debug(
              `Hourly check: Marked appointment ${appointment.id} (${appointment.user.firstName} ${appointment.user.lastName}) as NO_SHOW`,
            );

            processedCount++;
          }
        } catch (error) {
          this.logger.error(
            `Error in hourly check for appointment ${appointment.id}: ${(error as Error).message}`,
          );
        }
      }

      if (processedCount > 0) {
        this.logger.log(
          `Hourly no-show check completed: ${processedCount} appointments marked as NO_SHOW`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Fatal error in hourly no-show check: ${(error as Error).message}`,
      );
    }
  }
}
