import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SlotGeneratorService } from './slot-generator.service';

@Injectable()
export class SlotsCronService {
  private readonly logger = new Logger(SlotsCronService.name);

  constructor(private readonly slotGeneratorService: SlotGeneratorService) {}

  /**
   * Cron job that runs daily at 2:00 AM
   * Generates slots for the next 7 days
   * This ensures there are always slots available for booking
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'daily-slot-generation',
    timeZone: 'America/Lima', // Ajusta según tu zona horaria
  })
  async handleDailySlotGeneration() {
    this.logger.log('Starting daily slot generation cron job...');

    try {
      const result = await this.slotGeneratorService.generateUpcomingSlots(7);

      this.logger.log(
        `Daily slot generation completed: ${result.totalSlotsCreated} created, ` +
          `${result.totalSlotsSkipped} skipped in ${result.duration}ms`,
      );

      if (result.errors.length > 0) {
        this.logger.warn(
          `Daily generation completed with ${result.errors.length} errors`,
        );
        result.errors.forEach((error) => this.logger.error(error));
      }
    } catch (error) {
      this.logger.error(
        `Fatal error in daily slot generation: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Optional: Weekly slot generation for longer-term planning
   * Runs every Sunday at 3:00 AM
   * Generates slots for the next 30 days
   */
  @Cron(CronExpression.EVERY_WEEK, {
    name: 'weekly-slot-generation',
    timeZone: 'America/Lima',
  })
  async handleWeeklySlotGeneration() {
    this.logger.log('Starting weekly slot generation cron job...');

    try {
      const result = await this.slotGeneratorService.generateUpcomingSlots(30);

      this.logger.log(
        `Weekly slot generation completed: ${result.totalSlotsCreated} created, ` +
          `${result.totalSlotsSkipped} skipped in ${result.duration}ms`,
      );

      if (result.errors.length > 0) {
        this.logger.warn(
          `Weekly generation completed with ${result.errors.length} errors`,
        );
        result.errors.forEach((error) => this.logger.error(error));
      }
    } catch (error) {
      this.logger.error(
        `Fatal error in weekly slot generation: ${(error as Error).message}`,
      );
    }
  }
}
