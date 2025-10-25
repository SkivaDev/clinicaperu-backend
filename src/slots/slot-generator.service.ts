import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  addWeeks,
  addDays,
  getDay,
  set,
  addMinutes,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { getScheduleConfig } from 'src/schedules/schedule.config';

export interface SlotGenerationConfig {
  weeksAhead?: number;
  daysAhead?: number;
}

export interface SlotGenerationResult {
  slotsCreated: number;
  slotsSkipped: number;
  errors: string[];
}

export interface BulkGenerationResult {
  totalSlotsCreated: number;
  totalSlotsSkipped: number;
  schedulesProcessed: number;
  errors: string[];
  duration: number;
}

@Injectable()
export class SlotGeneratorService {
  private readonly logger = new Logger(SlotGeneratorService.name);
  private readonly config = getScheduleConfig();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates slots for a specific schedule
   */
  async generateSlotsForSchedule(
    tx: any,
    schedule: any,
    config: Partial<SlotGenerationConfig> = {},
  ): Promise<SlotGenerationResult> {
    const daysAhead =
      config.daysAhead ||
      (config.weeksAhead || this.config.SLOT_GENERATION_WEEKS) * 7;
    const result: SlotGenerationResult = {
      slotsCreated: 0,
      slotsSkipped: 0,
      errors: [],
    };

    try {
      // Get doctor unavailabilities for the period
      const unavailabilities = await this.getDoctorUnavailabilities(
        tx,
        schedule.doctorId,
        daysAhead,
      );

      // Generate slots for the period
      const slots = await this.calculateSlotsForSchedule(
        schedule,
        daysAhead,
        unavailabilities,
      );

      if (slots.length === 0) {
        return result;
      }

      // Create slots in batch with skipDuplicates
      const createResult = await tx.slot.createMany({
        data: slots,
        skipDuplicates: true,
      });

      result.slotsCreated = createResult.count;
      result.slotsSkipped = slots.length - createResult.count;
    } catch (error) {
      result.errors.push(`Error generating slots for schedule ${schedule.id}: ${error.message}`);
    }

    return result;
  }

  /**
   * Generates slots for multiple active schedules
   */
  async generateSlotsForActiveSchedules(
    tx: any,
    schedules: any[],
    config: Partial<SlotGenerationConfig> = {},
  ): Promise<SlotGenerationResult[]> {
    const activeSchedules = schedules.filter((s) => s.isActive);

    // Process schedules in parallel for better performance
    const promises = activeSchedules.map((schedule) =>
      this.generateSlotsForSchedule(tx, schedule, config),
    );

    return Promise.all(promises);
  }

  /**
   * Gets doctor unavailabilities for the specified period
   */
  private async getDoctorUnavailabilities(
    tx: any,
    doctorId: string,
    daysAhead: number,
  ): Promise<any[]> {
    const startDate = startOfDay(new Date());
    const endDate = endOfDay(addDays(new Date(), daysAhead));

    return tx.doctorUnavailability.findMany({
      where: {
        doctorId,
        startAt: { lte: endDate },
        endAt: { gte: startDate },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  /**
   * Calculates all slots for a schedule within the specified period
   */
  private async calculateSlotsForSchedule(
    schedule: any,
    daysAhead: number,
    unavailabilities: any[],
  ): Promise<any[]> {
    const slots: any[] = [];
    const startDate = new Date();
    const endDate = addDays(startDate, daysAhead);

    // Parse schedule times
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);

    // Find all dates that match the schedule's day of week
    const targetDates = this.findDatesForDayOfWeek(
      startDate,
      endDate,
      schedule.dayOfWeek,
    );

    // Generate slots for each target date
    for (const targetDate of targetDates) {
      // Check if date is within effective period
      if (!this.isDateWithinEffectivePeriod(targetDate, schedule)) {
        continue;
      }

      const daySlots = this.generateSlotsForDate(
        targetDate,
        startHour,
        startMinute,
        endHour,
        endMinute,
        schedule.slotMinutes,
        schedule.id,
      );

      // Filter out slots that overlap with unavailabilities
      const availableSlots = daySlots.filter((slot) =>
        this.isSlotAvailable(slot, unavailabilities),
      );

      slots.push(...availableSlots);
    }

    return slots;
  }

  /**
   * Finds all dates within the period that match the specified day of week
   */
  private findDatesForDayOfWeek(
    startDate: Date,
    endDate: Date,
    dayOfWeek: number,
  ): Date[] {
    const dates: Date[] = [];
    let currentDate = startDate;

    // Find the first occurrence of the target day of week
    while (getDay(currentDate) !== dayOfWeek) {
      currentDate = addDays(currentDate, 1);
    }

    // Add all occurrences of the day of week within the period
    while (isBefore(currentDate, endDate)) {
      dates.push(new Date(currentDate));
      currentDate = addWeeks(currentDate, 1);
    }

    return dates;
  }

  /**
   * Checks if a date is within the schedule's effective period
   */
  private isDateWithinEffectivePeriod(date: Date, schedule: any): boolean {
    const targetDate = startOfDay(date);

    if (schedule.effectiveFrom && isBefore(targetDate, schedule.effectiveFrom)) {
      return false;
    }

    if (schedule.effectiveTo && isAfter(targetDate, schedule.effectiveTo)) {
      return false;
    }

    return true;
  }

  /**
   * Generates slots for a specific date
   */
  private generateSlotsForDate(
    date: Date,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
    slotMinutes: number,
    scheduleId: string,
  ): any[] {
    const slots: any[] = [];

    // Create start time for the date
    let currentTime = set(date, {
      hours: startHour,
      minutes: startMinute,
      seconds: 0,
      milliseconds: 0,
    });

    const endTime = set(date, {
      hours: endHour,
      minutes: endMinute,
      seconds: 0,
      milliseconds: 0,
    });

    // Generate slots until we reach the end time
    while (currentTime < endTime) {
      const slotEndTime = addMinutes(currentTime, slotMinutes);

      // Don't create a slot if it would exceed the schedule end time
      if (slotEndTime > endTime) {
        break;
      }

      slots.push({
        scheduleId,
        startAt: currentTime,
        endAt: slotEndTime,
        status: 'FREE' as const,
        isActive: true,
      });

      currentTime = slotEndTime;
    }

    return slots;
  }

  /**
   * Checks if a slot is available (doesn't overlap with unavailabilities)
   */
  private isSlotAvailable(slot: any, unavailabilities: any[]): boolean {
    return !unavailabilities.some(
      (unavailability) =>
        slot.startAt < unavailability.endAt && slot.endAt > unavailability.startAt,
    );
  }

  /**
   * Cleans up future free slots for inactive schedules
   * Now uses soft deletion (isActive = false) instead of hard deletion
   */
  async cleanupFutureFreeSlotsForDoctor(
    tx: any,
    doctorId: string,
  ): Promise<number> {
    const result = await tx.slot.updateMany({
      where: {
        schedule: { doctorId },
        startAt: { gte: new Date() },
        status: 'FREE',
        isActive: true,
      },
      data: { isActive: false },
    });

    return result.count;
  }

  /**
   * Generates slots for all active schedules
   * Main method for bulk slot generation
   * Uses raw SQL with INSERT ... ON CONFLICT DO NOTHING for performance
   */
  async generateSlotsForAllSchedules(
    config: SlotGenerationConfig = {},
  ): Promise<BulkGenerationResult> {
    const startTime = Date.now();
    const result: BulkGenerationResult = {
      totalSlotsCreated: 0,
      totalSlotsSkipped: 0,
      schedulesProcessed: 0,
      errors: [],
      duration: 0,
    };

    this.logger.log('Starting bulk slot generation...');

    try {
      // Calculate period
      const daysAhead =
        config.daysAhead ||
        (config.weeksAhead || this.config.SLOT_GENERATION_WEEKS) * 7;

      this.logger.log(`Generating slots for the next ${daysAhead} days`);

      // Get all active schedules
      const schedules = await this.prisma.schedule.findMany({
        where: { isActive: true },
        include: {
          doctor: {
            select: {
              id: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      if (schedules.length === 0) {
        this.logger.warn('No active schedules found');
        result.duration = Date.now() - startTime;
        return result;
      }

      this.logger.log(`Found ${schedules.length} active schedules`);

      // Use transaction for better performance
      await this.prisma.$transaction(async (tx) => {
        // Process schedules in batches for better performance
        const batchSize = 10;
        for (let i = 0; i < schedules.length; i += batchSize) {
          const batch = schedules.slice(i, i + batchSize);

          await Promise.all(
            batch.map(async (schedule) => {
              try {
                const scheduleResult = await this.generateSlotsForSchedule(
                  tx,
                  schedule,
                  { daysAhead },
                );

                result.totalSlotsCreated += scheduleResult.slotsCreated;
                result.totalSlotsSkipped += scheduleResult.slotsSkipped;
                result.schedulesProcessed++;

                if (scheduleResult.errors.length > 0) {
                  result.errors.push(...scheduleResult.errors);
                }

                this.logger.debug(
                  `Schedule ${schedule.id} (${schedule.doctor.user.firstName} ${schedule.doctor.user.lastName}): ` +
                    `${scheduleResult.slotsCreated} created, ${scheduleResult.slotsSkipped} skipped`,
                );

                return scheduleResult;
              } catch (error) {
                const errorMsg = `Error processing schedule ${schedule.id}: ${(error as Error).message}`;
                this.logger.error(errorMsg);
                result.errors.push(errorMsg);
                return null;
              }
            }),
          );
        }
      });

      result.duration = Date.now() - startTime;

      this.logger.log(
        `Slot generation completed: ${result.totalSlotsCreated} created, ` +
          `${result.totalSlotsSkipped} skipped, ${result.schedulesProcessed} schedules processed ` +
          `in ${result.duration}ms`,
      );

      if (result.errors.length > 0) {
        this.logger.warn(
          `Generation completed with ${result.errors.length} errors`,
        );
      }
    } catch (error) {
      const errorMsg = `Fatal error during bulk slot generation: ${(error as Error).message}`;
      this.logger.error(errorMsg);
      result.errors.push(errorMsg);
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Generates slots for the next N days (used by cron job)
   * Default: 7 days ahead
   */
  async generateUpcomingSlots(
    daysAhead: number = 7,
  ): Promise<BulkGenerationResult> {
    this.logger.log(
      `Cron job: Generating slots for the next ${daysAhead} days`,
    );
    return this.generateSlotsForAllSchedules({ daysAhead });
  }
}
