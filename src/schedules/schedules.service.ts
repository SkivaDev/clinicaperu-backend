// schedule/schedule.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';
import { QueryScheduleDto } from './dto/query-schedule.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SlotGeneratorService } from 'src/slots/slot-generator.service';
import { SlotsService } from 'src/slots/slots.service';
import { getScheduleConfig } from './schedule.config';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slotGenerator: SlotGeneratorService,
    private readonly slotsService: SlotsService,
  ) {}

  private readonly scheduleConfig = getScheduleConfig();

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
    await Promise.all([
      this.validateDoctorExists(doctorId),
      this.validateActiveSchedules(schedules),
    ]);

    // 2. Validar solapamientos
    this.validateNoOverlappingSchedules(schedules);

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

  private validateActiveSchedules(schedules: CreateScheduleDto[]): void {
    const activeSchedules = schedules.filter((s) => s.isActive !== false);

    if (activeSchedules.length === 0) {
      throw new BadRequestException(
        'El doctor debe tener al menos un horario activo',
      );
    }
  }

  private validateNoOverlappingSchedules(schedules: CreateScheduleDto[]): void {
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

  /**
   * Deactivates a specific schedule and its future free slots
   * This method implements soft deletion without losing historical data
   */
  async deactivateSchedule(
    doctorId: string,
    scheduleId: string,
  ): Promise<{
    scheduleDeactivated: boolean;
    slotsDeactivated: number;
    slotsPreserved: number;
    futureBookedCount: number;
    errors: string[];
    warnings: string[];
  }> {
    await this.validateDoctorExists(doctorId);

    return await this.prisma.$transaction(async (tx) => {
      // 1️⃣ Verify the schedule exists and belongs to the doctor
      const schedule = await tx.schedule.findUnique({
        where: { id: scheduleId },
        select: { id: true, doctorId: true, isActive: true },
      });

      if (!schedule) {
        throw new NotFoundException('Schedule not found');
      }

      if (schedule.doctorId !== doctorId) {
        throw new BadRequestException(
          'Schedule does not belong to this doctor',
        );
      }

      if (!schedule.isActive) {
        return {
          scheduleDeactivated: false,
          slotsDeactivated: 0,
          slotsPreserved: 0,
          futureBookedCount: 0,
          errors: ['Schedule is already inactive'],
          warnings: [],
        };
      }

      // 2️⃣ Check for future booked appointments
      const bookedCheck = await this.hasFutureBookedAppointments(scheduleId);
      const warnings: string[] = [];

      if (bookedCheck.hasBookedSlots) {
        warnings.push(
          `ADVERTENCIA: Este horario tiene ${bookedCheck.count} cita(s) futura(s) reservada(s). ` +
            `Estas citas se mantendrán pero no podrás crear nuevas en este horario.`,
        );
      }

      // 3️⃣ Deactivate the schedule
      await tx.schedule.update({
        where: { id: scheduleId },
        data: { isActive: false },
      });

      // 4️⃣ Deactivate future free slots for this schedule
      const slotResult =
        await this.slotsService.deactivateFutureFreeSlotsForSchedule(
          tx,
          scheduleId,
        );

      return {
        scheduleDeactivated: true,
        slotsDeactivated: slotResult.slotsDeactivated,
        slotsPreserved: slotResult.slotsPreserved,
        futureBookedCount: bookedCheck.count,
        errors: slotResult.errors,
        warnings,
      };
    });
  }

  /**
   * Reactivates a schedule and regenerates its slots
   * This method is used when a schedule needs to be reactivated
   */
  async reactivateSchedule(
    doctorId: string,
    scheduleId: string,
  ): Promise<{
    scheduleReactivated: boolean;
    slotsReactivated: number;
    slotsGenerated: number;
    errors: string[];
  }> {
    await this.validateDoctorExists(doctorId);

    return await this.prisma.$transaction(async (tx) => {
      // 1️⃣ Verify the schedule exists and belongs to the doctor
      const schedule = await tx.schedule.findUnique({
        where: { id: scheduleId },
        select: { id: true, doctorId: true, isActive: true },
      });

      if (!schedule) {
        throw new NotFoundException('Schedule not found');
      }

      if (schedule.doctorId !== doctorId) {
        throw new BadRequestException(
          'Schedule does not belong to this doctor',
        );
      }

      if (schedule.isActive) {
        return {
          scheduleReactivated: false,
          slotsReactivated: 0,
          slotsGenerated: 0,
          errors: ['Schedule is already active'],
        };
      }

      // 2️⃣ Reactivate the schedule
      await tx.schedule.update({
        where: { id: scheduleId },
        data: { isActive: true },
      });

      // 3️⃣ Reactivate existing future slots
      const reactivateResult =
        await this.slotsService.reactivateSlotsForSchedule(tx, scheduleId);

      // 4️⃣ Generate new slots for the reactivated schedule
      const scheduleData = await tx.schedule.findUnique({
        where: { id: scheduleId },
      });

      const generateResult = await this.slotGenerator.generateSlotsForSchedule(
        tx,
        scheduleData,
      );

      return {
        scheduleReactivated: true,
        slotsReactivated: reactivateResult.slotsReactivated,
        slotsGenerated: generateResult.slotsCreated,
        errors: [...reactivateResult.errors, ...generateResult.errors],
      };
    });
  }

  /**
   * Gets all schedules for a doctor (including inactive ones)
   * This is useful for administrative purposes
   */
  async getAllDoctorSchedules(
    doctorId: string,
  ): Promise<ScheduleResponseDto[]> {
    await this.validateDoctorExists(doctorId);

    const schedules = await this.prisma.schedule.findMany({
      where: { doctorId },
      include: {
        slots: {
          orderBy: { startAt: 'asc' },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return this.mapSchedulesToResponse(schedules);
  }

  /**
   * Gets only inactive schedules for a doctor
   * This is useful for reactivation purposes
   */
  async getInactiveDoctorSchedules(
    doctorId: string,
  ): Promise<ScheduleResponseDto[]> {
    await this.validateDoctorExists(doctorId);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        doctorId,
        isActive: false,
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

  /**
   * Creates a single schedule (HU-020 requirement)
   */
  async create(dto: CreateScheduleDto): Promise<ScheduleResponseDto> {
    // Validate doctor exists
    await this.validateDoctorExists(dto.doctorId);

    // Validate time logic
    this.validateTimeRange(dto.startTime, dto.endTime);
    this.validateSlotDuration(dto.startTime, dto.endTime, dto.slotMinutes);
    this.validateEffectiveDates(dto.effectiveFrom, dto.effectiveTo);

    // Validate MAX_SCHEDULES_PER_DAY limit
    await this.validateMaxSchedulesPerDay(dto.doctorId, dto.dayOfWeek);

    // Check for overlaps with existing schedules
    await this.validateNoOverlapWithExisting(dto);

    return await this.prisma.$transaction(async (tx) => {
      // Create the schedule
      const schedule = await tx.schedule.create({
        data: {
          doctorId: dto.doctorId,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
          endTime: dto.endTime,
          slotMinutes: dto.slotMinutes,
          effectiveFrom: dto.effectiveFrom || null,
          effectiveTo: dto.effectiveTo || null,
          isActive: dto.isActive !== false,
        },
        include: {
          slots: {
            orderBy: { startAt: 'asc' },
          },
        },
      });

      // Generate slots if schedule is active
      if (schedule.isActive) {
        await this.slotGenerator.generateSlotsForSchedule(tx, schedule);
      }

      // Return the created schedule with slots
      const scheduleWithSlots = await tx.schedule.findUnique({
        where: { id: schedule.id },
        include: {
          slots: {
            orderBy: { startAt: 'asc' },
          },
        },
      });

      return this.mapSchedulesToResponse([scheduleWithSlots])[0];
    });
  }

  /**
   * Finds all schedules with optional filters (HU-020 requirement)
   */
  async findAll(query: QueryScheduleDto): Promise<ScheduleResponseDto[]> {
    const where: any = {};

    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }

    if (query.dayOfWeek !== undefined) {
      where.dayOfWeek = query.dayOfWeek;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: {
        slots: {
          orderBy: { startAt: 'asc' },
        },
        doctor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
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
      orderBy: [
        { doctorId: 'asc' },
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return this.mapSchedulesToResponse(schedules);
  }

  /**
   * Finds a single schedule by ID (HU-020 requirement)
   */
  async findOne(id: string): Promise<ScheduleResponseDto> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        slots: {
          orderBy: { startAt: 'asc' },
        },
        doctor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
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
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    return this.mapSchedulesToResponse([schedule])[0];
  }

  /**
   * Updates a single schedule (HU-020 requirement)
   * Cannot update if slots have been generated
   */
  async update(
    id: string,
    dto: Partial<CreateScheduleDto>,
  ): Promise<ScheduleResponseDto> {
    // Verify schedule exists
    const existingSchedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        _count: {
          select: { slots: true },
        },
      },
    });

    if (!existingSchedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    // Validate doctor ownership if doctorId is provided in dto
    if (dto.doctorId && dto.doctorId !== existingSchedule.doctorId) {
      throw new BadRequestException(
        'No se puede cambiar el doctor de un horario existente',
      );
    }

    // Check if schedule has generated slots
    if (existingSchedule._count.slots > 0) {
      throw new ConflictException(
        'No se puede actualizar un horario que ya tiene slots generados. Desactívelo y cree uno nuevo.',
      );
    }

    // Validate new data if provided
    if (dto.startTime && dto.endTime) {
      this.validateTimeRange(dto.startTime, dto.endTime);
    }

    if (dto.startTime || dto.endTime || dto.slotMinutes) {
      const startTime = dto.startTime || existingSchedule.startTime;
      const endTime = dto.endTime || existingSchedule.endTime;
      const slotMinutes = dto.slotMinutes || existingSchedule.slotMinutes;
      this.validateSlotDuration(startTime, endTime, slotMinutes);
    }

    if (dto.effectiveFrom || dto.effectiveTo) {
      this.validateEffectiveDates(
        dto.effectiveFrom || existingSchedule.effectiveFrom,
        dto.effectiveTo || existingSchedule.effectiveTo,
      );
    }

    // Validate no overlap with other schedules if day or times are changing
    if (dto.dayOfWeek !== undefined || dto.startTime || dto.endTime) {
      await this.validateNoOverlapWithExistingExcludingSelf(
        existingSchedule.doctorId,
        dto.dayOfWeek ?? existingSchedule.dayOfWeek,
        dto.startTime ?? existingSchedule.startTime,
        dto.endTime ?? existingSchedule.endTime,
        id,
      );
    }

    // Update the schedule
    const updatedSchedule = await this.prisma.schedule.update({
      where: { id },
      data: {
        ...(dto.dayOfWeek !== undefined && { dayOfWeek: dto.dayOfWeek }),
        ...(dto.startTime && { startTime: dto.startTime }),
        ...(dto.endTime && { endTime: dto.endTime }),
        ...(dto.slotMinutes && { slotMinutes: dto.slotMinutes }),
        ...(dto.effectiveFrom !== undefined && {
          effectiveFrom: dto.effectiveFrom,
        }),
        ...(dto.effectiveTo !== undefined && { effectiveTo: dto.effectiveTo }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        slots: {
          orderBy: { startAt: 'asc' },
        },
        doctor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
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
    });

    return this.mapSchedulesToResponse([updatedSchedule])[0];
  }

  /**
   * Soft deletes a schedule (HU-020 requirement)
   */
  async remove(id: string): Promise<ScheduleResponseDto> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    // Soft delete: mark as inactive
    const deactivatedSchedule = await this.prisma.schedule.update({
      where: { id },
      data: { isActive: false },
      include: {
        slots: {
          orderBy: { startAt: 'asc' },
        },
        doctor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
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
    });

    // Deactivate future free slots
    await this.slotsService.deactivateFutureFreeSlotsForSchedule(
      this.prisma,
      id,
    );

    return this.mapSchedulesToResponse([deactivatedSchedule])[0];
  }

  /**
   * Helper: Validates time range
   */
  private validateTimeRange(startTime: string, endTime: string): void {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    if (startMinutes >= endMinutes) {
      throw new BadRequestException(
        'La hora de inicio debe ser menor que la hora de fin',
      );
    }
  }

  /**
   * Helper: Validates slot duration fits in time range
   */
  private validateSlotDuration(
    startTime: string,
    endTime: string,
    slotMinutes: number,
  ): void {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    const totalMinutes = endMinutes - startMinutes;

    if (totalMinutes < slotMinutes) {
      throw new BadRequestException(
        'La duración del slot es mayor que el rango de tiempo disponible',
      );
    }

    // Optional: Check if slot duration divides evenly
    if (totalMinutes % slotMinutes !== 0) {
      console.warn(
        `Slot duration ${slotMinutes} does not divide evenly into ${totalMinutes} minutes`,
      );
    }
  }

  /**
   * Helper: Validates effective dates
   */
  private validateEffectiveDates(
    effectiveFrom?: Date | null,
    effectiveTo?: Date | null,
  ): void {
    if (effectiveFrom && effectiveTo) {
      if (effectiveFrom >= effectiveTo) {
        throw new BadRequestException(
          'effectiveFrom debe ser menor que effectiveTo',
        );
      }
    }
  }

  /**
   * Helper: Validates no overlap with existing schedules
   */
  private async validateNoOverlapWithExisting(
    dto: CreateScheduleDto,
  ): Promise<void> {
    const existingSchedules = await this.prisma.schedule.findMany({
      where: {
        doctorId: dto.doctorId,
        dayOfWeek: dto.dayOfWeek,
        isActive: true,
      },
    });

    for (const existing of existingSchedules) {
      if (
        this.timesOverlap(
          dto.startTime,
          dto.endTime,
          existing.startTime,
          existing.endTime,
        )
      ) {
        throw new ConflictException(
          `El horario se solapa con un horario existente en ${this.DAY_NAMES[dto.dayOfWeek]} (${existing.startTime} - ${existing.endTime})`,
        );
      }
    }
  }

  /**
   * Helper: Check if two time ranges overlap
   */
  private timesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  /**
   * Helper: Convert time string to minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Helper: Validates MAX_SCHEDULES_PER_DAY limit
   */
  private async validateMaxSchedulesPerDay(
    doctorId: string,
    dayOfWeek: number,
  ): Promise<void> {
    const count = await this.prisma.schedule.count({
      where: {
        doctorId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (count >= this.scheduleConfig.MAX_SCHEDULES_PER_DAY) {
      throw new BadRequestException(
        `No se pueden crear más de ${this.scheduleConfig.MAX_SCHEDULES_PER_DAY} horarios por día. ` +
          `Actualmente tienes ${count} horarios activos en ${this.DAY_NAMES[dayOfWeek]}.`,
      );
    }
  }

  /**
   * Helper: Validates no overlap with existing schedules (excluding a specific schedule)
   */
  private async validateNoOverlapWithExistingExcludingSelf(
    doctorId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeScheduleId: string,
  ): Promise<void> {
    const existingSchedules = await this.prisma.schedule.findMany({
      where: {
        doctorId,
        dayOfWeek,
        isActive: true,
        id: { not: excludeScheduleId },
      },
    });

    for (const existing of existingSchedules) {
      if (
        this.timesOverlap(
          startTime,
          endTime,
          existing.startTime,
          existing.endTime,
        )
      ) {
        throw new ConflictException(
          `El horario se solapa con un horario existente en ${this.DAY_NAMES[dayOfWeek]} (${existing.startTime} - ${existing.endTime})`,
        );
      }
    }
  }

  /**
   * Helper: Checks if there are future booked appointments for a schedule
   */
  private async hasFutureBookedAppointments(
    scheduleId: string,
  ): Promise<{ hasBookedSlots: boolean; count: number }> {
    const count = await this.prisma.slot.count({
      where: {
        scheduleId,
        startAt: { gte: new Date() },
        status: { in: ['BOOKED', 'HELD'] },
      },
    });

    return {
      hasBookedSlots: count > 0,
      count,
    };
  }
}
