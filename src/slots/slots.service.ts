import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SlotStatus } from '@prisma/client';

export interface SlotDeactivationResult {
  slotsDeactivated: number;
  slotsPreserved: number;
  errors: string[];
}

export interface SlotAvailabilityFilter {
  doctorId?: string;
  scheduleId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: SlotStatus;
  isActive?: boolean;
}

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deactivates future free slots for a specific schedule
   * This is called when a schedule is deactivated
   */
  async deactivateFutureFreeSlotsForSchedule(
    tx: any,
    scheduleId: string,
  ): Promise<SlotDeactivationResult> {
    const result: SlotDeactivationResult = {
      slotsDeactivated: 0,
      slotsPreserved: 0,
      errors: [],
    };

    try {
      // Get count of slots that will be deactivated
      const futureFreeSlots = await tx.slot.findMany({
        where: {
          scheduleId,
          startAt: { gte: new Date() },
          status: 'FREE',
          isActive: true,
        },
        select: { id: true },
      });

      // Deactivate future free slots
      const updateResult = await tx.slot.updateMany({
        where: {
          scheduleId,
          startAt: { gte: new Date() },
          status: 'FREE',
          isActive: true,
        },
        data: { isActive: false },
      });

      result.slotsDeactivated = updateResult.count;
      result.slotsPreserved = futureFreeSlots.length - updateResult.count;
    } catch (error) {
      result.errors.push(`Error deactivating slots for schedule ${scheduleId}: ${error.message}`);
    }

    return result;
  }

  /**
   * Deactivates future free slots for all schedules of a doctor
   * This is called when updating schedules (soft deletion)
   */
  async deactivateFutureFreeSlotsForDoctor(
    tx: any,
    doctorId: string,
  ): Promise<SlotDeactivationResult> {
    const result: SlotDeactivationResult = {
      slotsDeactivated: 0,
      slotsPreserved: 0,
      errors: [],
    };

    try {
      // Get all schedules for the doctor
      const schedules = await tx.schedule.findMany({
        where: { doctorId },
        select: { id: true },
      });

      // Deactivate future free slots for each schedule
      for (const schedule of schedules) {
        const scheduleResult = await this.deactivateFutureFreeSlotsForSchedule(
          tx,
          schedule.id,
        );
        result.slotsDeactivated += scheduleResult.slotsDeactivated;
        result.slotsPreserved += scheduleResult.slotsPreserved;
        result.errors.push(...scheduleResult.errors);
      }
    } catch (error) {
      result.errors.push(`Error deactivating slots for doctor ${doctorId}: ${error.message}`);
    }

    return result;
  }

  /**
   * Gets available slots with proper filtering
   * Only returns slots that are FREE and ACTIVE
   */
  async getAvailableSlots(
    filters: SlotAvailabilityFilter = {},
  ): Promise<any[]> {
    const whereClause: any = {
      isActive: true,
      status: 'FREE',
    };

    if (filters.doctorId) {
      whereClause.schedule = { doctorId: filters.doctorId };
    }

    if (filters.scheduleId) {
      whereClause.scheduleId = filters.scheduleId;
    }

    if (filters.startDate) {
      whereClause.startAt = { gte: filters.startDate };
    }

    if (filters.endDate) {
      whereClause.startAt = {
        ...whereClause.startAt,
        lte: filters.endDate,
      };
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }

    return this.prisma.slot.findMany({
      where: whereClause,
      include: {
        schedule: {
          include: {
            doctor: {
              include: {
                user: true,
                specialty: true,
                clinic: true,
              },
            },
          },
        },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  /**
   * Gets slots for a specific doctor with optional filtering
   */
  async getDoctorSlots(
    doctorId: string,
    filters: Omit<SlotAvailabilityFilter, 'doctorId'> = {},
  ): Promise<any[]> {
    return this.getAvailableSlots({
      ...filters,
      doctorId,
    });
  }

  /**
   * Gets slots for a specific schedule
   */
  async getScheduleSlots(
    scheduleId: string,
    filters: Omit<SlotAvailabilityFilter, 'scheduleId'> = {},
  ): Promise<any[]> {
    return this.getAvailableSlots({
      ...filters,
      scheduleId,
    });
  }

  /**
   * Reactivates slots for a schedule when it becomes active again
   * This is called when a schedule is reactivated
   */
  async reactivateSlotsForSchedule(
    tx: any,
    scheduleId: string,
  ): Promise<{ slotsReactivated: number; errors: string[] }> {
    const result = {
      slotsReactivated: 0,
      errors: [] as string[],
    };

    try {
      // Reactivate future slots that were deactivated
      const updateResult = await tx.slot.updateMany({
        where: {
          scheduleId,
          startAt: { gte: new Date() },
          isActive: false,
        },
        data: { isActive: true },
      });

      result.slotsReactivated = updateResult.count;
    } catch (error) {
      result.errors.push(`Error reactivating slots for schedule ${scheduleId}: ${error.message}`);
    }

    return result;
  }

  /**
   * Gets slot statistics for a doctor
   */
  async getSlotStatistics(doctorId: string): Promise<{
    totalSlots: number;
    activeSlots: number;
    inactiveSlots: number;
    freeSlots: number;
    bookedSlots: number;
    heldSlots: number;
    blockedSlots: number;
    futureSlots: number;
    pastSlots: number;
  }> {
    const now = new Date();

    const [totalStats, activeStats, statusStats, timeStats] = await Promise.all([
      this.prisma.slot.count({
        where: { schedule: { doctorId } },
      }),
      this.prisma.slot.groupBy({
        by: ['isActive'],
        where: { schedule: { doctorId } },
        _count: { _all: true },
      }),
      this.prisma.slot.groupBy({
        by: ['status'],
        where: { 
          schedule: { doctorId },
          isActive: true,
        },
        _count: { _all: true },
      }),
      this.prisma.slot.groupBy({
        by: ['isActive'],
        where: { 
          schedule: { doctorId },
          startAt: { gte: now },
        },
        _count: { _all: true },
      }),
    ]);

    const activeSlots = activeStats.find((s) => s.isActive)?._count._all || 0;
    const inactiveSlots = activeStats.find((s) => !s.isActive)?._count._all || 0;

    const freeSlots = statusStats.find((s) => s.status === 'FREE')?._count._all || 0;
    const bookedSlots = statusStats.find((s) => s.status === 'BOOKED')?._count._all || 0;
    const heldSlots = statusStats.find((s) => s.status === 'HELD')?._count._all || 0;
    const blockedSlots = statusStats.find((s) => s.status === 'BLOCKED')?._count._all || 0;

    const futureSlots = timeStats.find((s) => s.isActive)?._count._all || 0;
    const pastSlots = totalStats - futureSlots;

    return {
      totalSlots: totalStats,
      activeSlots,
      inactiveSlots,
      freeSlots,
      bookedSlots,
      heldSlots,
      blockedSlots,
      futureSlots,
      pastSlots,
    };
  }

  /**
   * Validates if a slot can be booked
   * A slot can be booked if it's FREE and ACTIVE
   */
  async canBookSlot(slotId: string): Promise<boolean> {
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      select: { status: true, isActive: true, startAt: true },
    });

    if (!slot) {
      return false;
    }

    // Slot must be FREE, ACTIVE, and in the future
    return (
      slot.status === 'FREE' &&
      slot.isActive === true &&
      slot.startAt > new Date()
    );
  }

  /**
   * Gets a slot by ID with validation
   */
  async getSlotById(slotId: string): Promise<any> {
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        schedule: {
          include: {
            doctor: {
              include: {
                user: true,
                specialty: true,
                clinic: true,
              },
            },
          },
        },
        appointment: true,
      },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    return slot;
  }
}