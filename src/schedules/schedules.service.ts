// schedule/schedule.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';
import { PrismaService } from 'src/prisma.service';
import { SlotResponseDto } from 'src/slots/dto/slot-response.dto';
import { SlotGeneratorService } from 'src/slots/slot-generator.service';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slotGenerator: SlotGeneratorService,
  ) {}

  private readonly DAY_NAMES = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ];

  async updateSchedules(
    doctorId: string,
    schedules: CreateScheduleDto[],
  ): Promise<ScheduleResponseDto[]> {
    // 1. Validación inicial en paralelo
    const [doctor, hasActiveSchedules] = await Promise.all([
      this.validateDoctorExists(doctorId),
      this.validateActiveSchedules(schedules),
    ]);

    // 2. Validar solapamientos
    await this.validateNoOverlappingSchedules(schedules);

    // 3. Transacción para actualizar todo
    return await this.prisma.$transaction(async (tx) => {
      // Marcar horarios existentes como inactivos (soft delete)
      await this.deactivateExistingSchedules(tx, doctorId);

      // Limpiar solo slots futuros libres de horarios desactivados
      await this.slotGenerator.cleanupFutureFreeSlotsForDoctor(tx, doctorId);

      // Crear nuevos horarios activos
      const newSchedules = await this.createNewSchedules(
        tx,
        doctorId,
        schedules,
      );

      // Generar slots para horarios activos
      await this.slotGenerator.generateSlotsForActiveSchedules(
        tx,
        newSchedules,
      );

      // Retornar horarios actualizados (solo activos)
      return this.getActiveSchedulesWithSlots(tx, doctorId);
    });
  }

  private async validateDoctorExists(doctorId: string): Promise<any> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true }, // Solo necesitamos saber si existe
    });

    if (!doctor) {
      throw new NotFoundException('Doctor no encontrado');
    }

    return doctor;
  }

  private async validateActiveSchedules(
    schedules: CreateScheduleDto[],
  ): Promise<void> {
    const activeSchedules = schedules.filter((s) => s.isActive !== false);

    if (activeSchedules.length === 0) {
      throw new BadRequestException(
        'El doctor debe tener al menos un horario activo',
      );
    }
  }

  private async validateNoOverlappingSchedules(
    schedules: CreateScheduleDto[],
  ): Promise<void> {
    const activeSchedules = schedules.filter((s) => s.isActive !== false);

    for (let day = 0; day <= 6; day++) {
      const daySchedules = activeSchedules.filter((s) => s.dayOfWeek === day);

      for (let i = 0; i < daySchedules.length; i++) {
        for (let j = i + 1; j < daySchedules.length; j++) {
          if (this.schedulesOverlap(daySchedules[i], daySchedules[j])) {
            throw new BadRequestException(
              `Hay horarios solapados en ${this.DAY_NAMES[day]}`,
            );
          }
        }
      }
    }
  }

  private schedulesOverlap(
    s1: CreateScheduleDto,
    s2: CreateScheduleDto,
  ): boolean {
    return s1.startTime < s2.endTime && s2.startTime < s1.endTime;
  }

  private async deactivateExistingSchedules(
    tx: any,
    doctorId: string,
  ): Promise<void> {
    // Marcar horarios existentes como inactivos (soft delete)
    await tx.schedule.updateMany({
      where: { doctorId },
      data: { isActive: false },
    });
  }

  private async createNewSchedules(
    tx: any,
    doctorId: string,
    schedules: CreateScheduleDto[],
  ): Promise<any[]> {
    const scheduleData = schedules.map((schedule) => ({
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      slotMinutes: schedule.slotMinutes,
      effectiveFrom: schedule.effectiveFrom || null,
      effectiveTo: schedule.effectiveTo || null,
      isActive: schedule.isActive !== false,
      doctorId,
    }));

    // Insertar los nuevos horarios
    await tx.schedule.createMany({ data: scheduleData });

    // Retornar solo los horarios activos recién creados
    return tx.schedule.findMany({
      where: {
        doctorId,
        isActive: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  private async getActiveSchedulesWithSlots(
    tx: any,
    doctorId: string,
  ): Promise<ScheduleResponseDto[]> {
    const schedules = await tx.schedule.findMany({
      where: {
        doctorId,
        isActive: true, // Solo horarios activos
      },
      include: {
        slots: {
          orderBy: { startAt: 'asc' },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return schedules.map((schedule) => ({
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      slotMinutes: schedule.slotMinutes,
      effectiveFrom: schedule.effectiveFrom,
      effectiveTo: schedule.effectiveTo,
      isActive: schedule.isActive,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
      slots: schedule.slots.map((slot) => ({
        id: slot.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        status: slot.status,
        holdExpiresAt: slot.holdExpiresAt,
        createdAt: slot.createdAt,
      })),
    }));
  }

  // Método auxiliar para obtener horarios activos (sin transacción)
  async getDoctorSchedules(doctorId: string): Promise<ScheduleResponseDto[]> {
    await this.validateDoctorExists(doctorId);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        doctorId,
        isActive: true, // Solo horarios activos
      },
      include: {
        slots: {
          orderBy: { startAt: 'asc' },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return this.mapSchedulesToResponse(schedules);
  }

  private mapSchedulesToResponse(schedules: any[]): ScheduleResponseDto[] {
    return schedules.map((schedule) => ({
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      slotMinutes: schedule.slotMinutes,
      effectiveFrom: schedule.effectiveFrom,
      effectiveTo: schedule.effectiveTo,
      isActive: schedule.isActive,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
      slots: schedule.slots?.map((slot) => ({
        id: slot.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        status: slot.status,
        holdExpiresAt: slot.holdExpiresAt,
        createdAt: slot.createdAt,
      })),
    }));
  }

  /**
   * Regenerates slots for all active schedules of a doctor
   * Useful for cron jobs or manual slot regeneration
   */
  async regenerateSlotsForDoctor(doctorId: string): Promise<{
    schedulesProcessed: number;
    slotsGenerated: number;
    errors: string[];
  }> {
    await this.validateDoctorExists(doctorId);

    return await this.prisma.$transaction(async (tx) => {
      // Get all active schedules for the doctor
      const activeSchedules = await tx.schedule.findMany({
        where: {
          doctorId,
          isActive: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      if (activeSchedules.length === 0) {
        return {
          schedulesProcessed: 0,
          slotsGenerated: 0,
          errors: ['No active schedules found for doctor'],
        };
      }

      // Clean up future free slots first
      await this.slotGenerator.cleanupFutureFreeSlotsForDoctor(tx, doctorId);

      // Generate new slots for all active schedules
      const results = await this.slotGenerator.generateSlotsForActiveSchedules(
        tx,
        activeSchedules,
      );

      const totalSlotsGenerated = results.reduce(
        (sum, result) => sum + result.slotsCreated,
        0,
      );
      const allErrors = results.flatMap((result) => result.errors);

      return {
        schedulesProcessed: activeSchedules.length,
        slotsGenerated: totalSlotsGenerated,
        errors: allErrors,
      };
    });
  }

  /**
   * Gets schedule statistics for a doctor
   */
  async getScheduleStatistics(doctorId: string): Promise<{
    totalSchedules: number;
    activeSchedules: number;
    inactiveSchedules: number;
    totalSlots: number;
    freeSlots: number;
    bookedSlots: number;
    heldSlots: number;
    blockedSlots: number;
  }> {
    await this.validateDoctorExists(doctorId);

    const [scheduleStats, slotStats] = await Promise.all([
      this.prisma.schedule.groupBy({
        by: ['isActive'],
        where: { doctorId },
        _count: { _all: true },
      }),
      this.prisma.slot.groupBy({
        by: ['status'],
        where: { schedule: { doctorId } },
        _count: { _all: true },
      }),
    ]);

    const activeSchedules =
      scheduleStats.find((s) => s.isActive)?._count._all || 0;
    const inactiveSchedules =
      scheduleStats.find((s) => !s.isActive)?._count._all || 0;

    const freeSlots =
      slotStats.find((s) => s.status === 'FREE')?._count._all || 0;
    const bookedSlots =
      slotStats.find((s) => s.status === 'BOOKED')?._count._all || 0;
    const heldSlots =
      slotStats.find((s) => s.status === 'HELD')?._count._all || 0;
    const blockedSlots =
      slotStats.find((s) => s.status === 'BLOCKED')?._count._all || 0;

    return {
      totalSchedules: activeSchedules + inactiveSchedules,
      activeSchedules,
      inactiveSchedules,
      totalSlots: freeSlots + bookedSlots + heldSlots + blockedSlots,
      freeSlots,
      bookedSlots,
      heldSlots,
      blockedSlots,
    };
  }
}
