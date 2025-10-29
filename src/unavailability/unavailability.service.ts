import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUnavailabilityDto } from './dto/create-unavailability.dto';
import { UpdateUnavailabilityDto } from './dto/update-unavailability.dto';
import { UnavailabilityResponseDto } from './dto/unavailability-response.dto';
import { DoctorResponseDto } from 'src/doctors/dto/doctor-response.dto';
import { CurrentUserPayload } from 'src/auth/types/current-user.interface';

@Injectable()
export class UnavailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new unavailability period for a doctor
   * Validates that no confirmed appointments exist in the period
   */
  async create(
    userId: string,
    dto: CreateUnavailabilityDto,
  ): Promise<UnavailabilityResponseDto> {
    // Validate doctor exists
    const doctorId = await this.validateDoctorExists(userId);

    // Validate date range
    this.validateDateRange(dto.startAt, dto.endAt);

    // Check for existing confirmed appointments
    await this.validateNoConfirmedAppointments(
      doctorId,
      dto.startAt,
      dto.endAt,
    );

    // Create unavailability period
    const unavailability = await this.prisma.doctorUnavailability.create({
      data: {
        doctorId,
        startAt: dto.startAt,
        endAt: dto.endAt,
        reason: dto.reason || null,
      },
    });

    return this.mapToResponse(unavailability);
  }

  /**
   * Gets all future unavailability periods for a doctor
   */
  async findAllFuture(
    doctorUser: CurrentUserPayload,
  ): Promise<UnavailabilityResponseDto[]> {
    const doctorId = await this.validateDoctorExists(doctorUser.userId);

    const now = new Date();
    const unavailabilities = await this.prisma.doctorUnavailability.findMany({
      where: {
        doctorId,
        endAt: {
          gte: now, // Only future or current periods
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    return unavailabilities.map((u) => this.mapToResponse(u));
  }

  /**
   * Gets all unavailability periods for a doctor (including past)
   */
  async findAll(
    doctorUser: CurrentUserPayload,
  ): Promise<UnavailabilityResponseDto[]> {
    const doctorId = await this.validateDoctorExists(doctorUser.userId);

    const unavailabilities = await this.prisma.doctorUnavailability.findMany({
      where: { doctorId },
      orderBy: {
        startAt: 'desc',
      },
    });

    return unavailabilities.map((u) => this.mapToResponse(u));
  }

  /**
   * Gets a specific unavailability period by ID
   */
  async findOne(
    doctorUser: CurrentUserPayload,
    id: string,
  ): Promise<UnavailabilityResponseDto> {
    const doctorId = await this.validateDoctorExists(doctorUser.userId);

    const unavailability = await this.prisma.doctorUnavailability.findUnique({
      where: { id },
    });

    if (!unavailability) {
      throw new NotFoundException(
        `Unavailability period with ID ${id} not found`,
      );
    }

    if (unavailability.doctorId !== doctorId) {
      throw new BadRequestException(
        'Unavailability period does not belong to this doctor',
      );
    }

    return this.mapToResponse(unavailability);
  }

  /**
   * Updates an unavailability period
   * Cannot update if there are confirmed appointments in the new period
   */
  async update(
    doctorUser: CurrentUserPayload,
    id: string,
    dto: UpdateUnavailabilityDto,
  ): Promise<UnavailabilityResponseDto> {
    const doctorId = await this.validateDoctorExists(doctorUser.userId);
    // Verify unavailability exists and belongs to doctor
    const existing = await this.findOne(doctorUser, id);

    // Validate new date range if provided
    const newStartAt = dto.startAt || existing.startAt;
    const newEndAt = dto.endAt || existing.endAt;

    this.validateDateRange(newStartAt, newEndAt);

    // Check for confirmed appointments in new period
    await this.validateNoConfirmedAppointments(doctorId, newStartAt, newEndAt);

    // Update
    const updated = await this.prisma.doctorUnavailability.update({
      where: { id },
      data: {
        ...(dto.startAt && { startAt: dto.startAt }),
        ...(dto.endAt && { endAt: dto.endAt }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Deletes an unavailability period
   * Cannot delete if there are confirmed appointments in the period
   */
  async remove(doctorUser: CurrentUserPayload, id: string): Promise<void> {
    const doctorId = await this.validateDoctorExists(doctorUser.userId);
    // Verify unavailability exists and belongs to doctor
    const unavailability = await this.findOne(doctorUser, id);

    // Check for confirmed appointments
    await this.validateNoConfirmedAppointments(
      doctorId,
      unavailability.startAt,
      unavailability.endAt,
    );

    // Delete
    await this.prisma.doctorUnavailability.delete({
      where: { id },
    });
  }

  /**
   * Checks if a specific date/time overlaps with any unavailability period
   * Used by slot generation
   */
  async isDateUnavailable(doctorId: string, date: Date): Promise<boolean> {
    const count = await this.prisma.doctorUnavailability.count({
      where: {
        doctorId,
        startAt: {
          lte: date,
        },
        endAt: {
          gte: date,
        },
      },
    });

    return count > 0;
  }

  /**
   * Gets all unavailability periods that overlap with a date range
   * Used by slot generation to exclude unavailable slots
   */
  async getUnavailabilityInRange(
    doctorId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UnavailabilityResponseDto[]> {
    const unavailabilities = await this.prisma.doctorUnavailability.findMany({
      where: {
        doctorId,
        OR: [
          // Unavailability starts within range
          {
            startAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Unavailability ends within range
          {
            endAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Unavailability encompasses entire range
          {
            AND: [
              {
                startAt: {
                  lte: startDate,
                },
              },
              {
                endAt: {
                  gte: endDate,
                },
              },
            ],
          },
        ],
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    return unavailabilities.map((u) => this.mapToResponse(u));
  }

  // ==================== Private Helper Methods ====================

  /**
   * Validates that a doctor exists
   */
  private async validateDoctorExists(userId: string): Promise<string> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: userId },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException(
        `Doctor with user ID ${userId} not found or does not exist`,
      );
    }
    return doctor.id;
  }

  /**
   * Validates that startAt is before endAt
   */
  private validateDateRange(startAt: Date, endAt: Date): void {
    if (startAt >= endAt) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin',
      );
    }

    // Optional: Validate that dates are in the future
    const now = new Date();
    if (startAt < now) {
      throw new BadRequestException('La fecha de inicio debe ser en el futuro');
    }
  }

  /**
   * Validates that there are no confirmed appointments in the date range
   */
  private async validateNoConfirmedAppointments(
    doctorId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<void> {
    const confirmedAppointments = await this.prisma.appointment.count({
      where: {
        doctorId,
        status: {
          in: ['CONFIRMED', 'PENDING'],
        },
        slot: {
          startAt: {
            gte: startAt,
            lte: endAt,
          },
        },
      },
    });

    if (confirmedAppointments > 0) {
      throw new ConflictException(
        `No se puede crear/modificar el período de no disponibilidad. Existen ${confirmedAppointments} cita(s) confirmada(s) o pendiente(s) en este rango de fechas.`,
      );
    }
  }

  /**
   * Maps database model to response DTO
   */
  private mapToResponse(unavailability: any): UnavailabilityResponseDto {
    return {
      id: unavailability.id,
      startAt: unavailability.startAt,
      endAt: unavailability.endAt,
      reason: unavailability.reason,
      doctorId: unavailability.doctorId,
      createdAt: unavailability.createdAt,
    };
  }
}
