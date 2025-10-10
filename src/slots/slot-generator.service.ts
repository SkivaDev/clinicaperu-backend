import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
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
  weeksAhead: number;
}

export interface SlotGenerationResult {
  slotsCreated: number;
  slotsSkipped: number;
  errors: string[];
}

@Injectable()
export class SlotGeneratorService {
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
    const weeksAhead = config.weeksAhead || this.config.SLOT_GENERATION_WEEKS;
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
        weeksAhead,
      );

      // Generate slots for each week
      const slots = await this.calculateSlotsForSchedule(
        schedule,
        weeksAhead,
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
    weeksAhead: number,
  ): Promise<any[]> {
    const startDate = startOfDay(new Date());
    const endDate = endOfDay(addWeeks(new Date(), weeksAhead));

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
    weeksAhead: number,
    unavailabilities: any[],
  ): Promise<any[]> {
    const slots: any[] = [];
    const startDate = new Date();
    const endDate = addWeeks(startDate, weeksAhead);

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
   */
  async cleanupFutureFreeSlotsForDoctor(
    tx: any,
    doctorId: string,
  ): Promise<number> {
    const result = await tx.slot.deleteMany({
      where: {
        schedule: { doctorId },
        startAt: { gte: new Date() },
        status: 'FREE',
      },
    });

    return result.count;
  }
}
