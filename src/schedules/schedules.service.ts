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

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

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
      // Eliminar horarios y slots existentes
      await this.deleteExistingSchedules(tx, doctorId);

      // Crear nuevos horarios
      const newSchedules = await this.createNewSchedules(
        tx,
        doctorId,
        schedules,
      );

      // Generar slots para horarios activos
      await this.generateSlotsForActiveSchedules(tx, newSchedules);

      // Retornar horarios actualizados
      return this.getSchedulesWithSlots(tx, doctorId);
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

  private async deleteExistingSchedules(
    tx: any,
    doctorId: string,
  ): Promise<void> {
    // Eliminar en el orden correcto para evitar violaciones de FK
    await tx.slot.deleteMany({
      where: { schedule: { doctorId } },
    });

    await tx.schedule.deleteMany({
      where: { doctorId },
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
    // Inserta los registros
    await tx.schedule.createMany({ data: scheduleData });
    // 👇 Devuelve los registros recién creados (para usarlos en generateSlots)
    return tx.schedule.findMany({
      where: { doctorId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  private async generateSlotsForActiveSchedules(
    tx: any,
    schedules: any[],
  ): Promise<void> {
    const activeSchedules = schedules.filter((s) => s.isActive);

    // Procesar en paralelo si hay muchos horarios
    const slotPromises = activeSchedules.map((schedule) =>
      this.generateSlotsForSchedule(tx, schedule),
    );

    await Promise.all(slotPromises);
  }

  private async generateSlotsForSchedule(
    tx: any,
    schedule: any,
  ): Promise<void> {
    const slots = this.calculateSlots(schedule);

    if (slots.length > 0) {
      await tx.slot.createMany({
        data: slots,
      });
    }
  }

  private calculateSlots(schedule: any): any[] {
    const slots: any[] = [];
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMinute < endMinute)
    ) {
      const startAt = new Date();
      startAt.setHours(currentHour, currentMinute, 0, 0);

      const endAt = new Date(startAt);
      endAt.setMinutes(endAt.getMinutes() + schedule.slotMinutes);

      // Verificar que no exceda el horario de fin
      if (
        endAt.getHours() > endHour ||
        (endAt.getHours() === endHour && endAt.getMinutes() > endMinute)
      ) {
        break;
      }

      slots.push({
        scheduleId: schedule.id,
        startAt: startAt,
        endAt: endAt,
        status: 'FREE' as const,
      });

      // Avanzar al siguiente slot
      currentMinute += schedule.slotMinutes;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    return slots;
  }

  private async getSchedulesWithSlots(
    tx: any,
    doctorId: string,
  ): Promise<ScheduleResponseDto[]> {
    const schedules = await tx.schedule.findMany({
      where: { doctorId },
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

  // Método auxiliar para obtener horarios (sin transacción)
  async getDoctorSchedules(doctorId: string): Promise<ScheduleResponseDto[]> {
    await this.validateDoctorExists(doctorId);

    const schedules = await this.prisma.schedule.findMany({
      where: { doctorId },
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
}
