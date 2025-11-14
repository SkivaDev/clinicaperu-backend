import { Injectable } from '@nestjs/common';
import { Prisma, SlotStatus, AppointmentStatus } from '@prisma/client';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryClinicDto, ClinicSortBy } from './dto/query-clinic.dto';
import {
  ClinicAlreadyExistsException,
  ClinicCannotBeDeactivatedException,
  ClinicUpdateNotAllowedException,
  ClinicNotFoundException,
} from './exceptions/clinic.exceptions';

export interface CanDeactivateClinicResponse {
  canDeactivate: boolean;
  reasons: string[];
  warnings: string[];
  metadata: {
    activeDoctors: number;
    activeRooms: number;
    futureAppointments: number;
  };
}

export interface ListClinicsResponse {
  data: Prisma.ClinicGetPayload<{ include: { rooms: true; doctors: true } }>[];
  stats: {
    totalClinics: number;
    activeClinics: number;
    inactiveClinics: number;
    totalDoctors: number;
    totalRooms: number;
  };
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

type NormalizedClinicPayload = {
  name?: string;
  address?: string;
  ubigeoDept?: string;
  ubigeoProv?: string;
  ubigeoDist?: string;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
};

@Injectable()
export class ClinicsService {
  constructor(private readonly prisma: PrismaService) {}

  async createClinic(dto: CreateClinicDto) {
    const normalized = this.normalizeClinicPayload(dto);
    const {
      name: normalizedName,
      address: normalizedAddress,
      ubigeoDept: normalizedUbigeoDept,
      ubigeoProv: normalizedUbigeoProv,
      ubigeoDist: normalizedUbigeoDist,
      phone: normalizedPhone,
      email: normalizedEmail,
      isActive: normalizedIsActive,
    } = normalized;

    const name = normalizedName ?? dto.name.trim();
    const address = normalizedAddress ?? dto.address.trim();
    const ubigeoDept =
      normalizedUbigeoDept ?? dto.ubigeoDept.trim().toUpperCase();
    const ubigeoProv =
      normalizedUbigeoProv ?? dto.ubigeoProv.trim().toUpperCase();
    const ubigeoDist =
      normalizedUbigeoDist ?? dto.ubigeoDist.trim().toUpperCase();
    const phone = normalizedPhone ?? dto.phone?.trim() ?? null;
    const email = normalizedEmail ?? dto.email?.trim().toLowerCase() ?? null;
    const isActive = normalizedIsActive ?? dto.isActive ?? true;

    const existingClinic = await this.prisma.clinic.findUnique({
      where: { name },
    });
    if (existingClinic) {
      throw new ClinicAlreadyExistsException('nombre', name);
    }

    return this.prisma.clinic.create({
      data: {
        name,
        address,
        ubigeoDept,
        ubigeoProv,
        ubigeoDist,
        phone,
        email,
        isActive,
      },
    });
  }

  async getClinicById(id: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: { rooms: true, doctors: true },
    });
    if (!clinic) throw new ClinicNotFoundException(id);
    return clinic;
  }

  async getClinicStats(id: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: { rooms: true, doctors: true },
    });
    if (!clinic) throw new ClinicNotFoundException(id);
    const activeDoctors = clinic.doctors.filter(
      (doctor) => doctor.isActive,
    ).length;
    const activeRooms = clinic.rooms.filter((room) => room.isActive).length;
    const totalActiveAppointments = await this.prisma.appointment.count({
      where: {
        doctor: { clinicId: id },
        slot: { startAt: { gte: new Date() } },
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        },
      },
    });
    return {
      activeDoctors,
      activeRooms,
      totalActiveAppointments,
    };
  }

  async listClinics(query?: QueryClinicDto): Promise<ListClinicsResponse> {
    const {
      search,
      ubigeoDept,
      ubigeoProv,
      ubigeoDist,
      isActive,
      sortBy = ClinicSortBy.NAME,
      sortOrder = 'asc',
      page = 1,
      limit = 10,
    } = query || {};

    const where: Prisma.ClinicWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (ubigeoDept) {
      where.ubigeoDept = {
        equals: ubigeoDept,
        mode: 'insensitive',
      };
    }

    if (ubigeoProv) {
      where.ubigeoProv = {
        equals: ubigeoProv,
        mode: 'insensitive',
      };
    }

    if (ubigeoDist) {
      where.ubigeoDist = {
        equals: ubigeoDist,
        mode: 'insensitive',
      };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const total = await this.prisma.clinic.count({ where });
    const skip = (page - 1) * limit;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    const orderBy: Prisma.ClinicOrderByWithRelationInput =
      sortBy === ClinicSortBy.NAME
        ? { name: sortOrder }
        : { [sortBy]: sortOrder };

    const clinics = await this.prisma.clinic.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: { rooms: true, doctors: true },
    });

    // 📊 Estadísticas
    const totalClinics = await this.prisma.clinic.count();
    const activeClinics = await this.prisma.clinic.count({
      where: { isActive: true },
    });
    const inactiveClinics = totalClinics - activeClinics;
    const totalDoctors = await this.prisma.doctor.count();
    const totalRooms = await this.prisma.room.count();

    return {
      data: clinics,
      stats: {
        totalClinics,
        activeClinics,
        inactiveClinics,
        totalDoctors,
        totalRooms,
      },
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: totalPages > 0 && page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async updateClinic(id: string, dto: UpdateClinicDto) {
    const clinic = await this.getClinicById(id);
    const normalizedUpdate = this.normalizeClinicPayload(dto);
    const { isActive, ...restUpdate } = normalizedUpdate;

    if (restUpdate.name && restUpdate.name !== clinic.name) {
      const existingClinic = await this.prisma.clinic.findUnique({
        where: { name: restUpdate.name },
      });
      if (existingClinic) {
        throw new ClinicAlreadyExistsException('nombre', restUpdate.name);
      }
    }

    if (isActive !== undefined) {
      const targetState = isActive;

      if (targetState === false && clinic.isActive) {
        return this.deactivateClinic(id);
      }

      if (targetState === true && !clinic.isActive) {
        await this.reactivateClinic(id);
      }
    }

    const ubigeoChanged =
      (restUpdate.ubigeoDept && restUpdate.ubigeoDept !== clinic.ubigeoDept) ||
      (restUpdate.ubigeoProv && restUpdate.ubigeoProv !== clinic.ubigeoProv) ||
      (restUpdate.ubigeoDist && restUpdate.ubigeoDist !== clinic.ubigeoDist);

    if (ubigeoChanged) {
      const [activeDoctors, futureAppointments] = await Promise.all([
        this.hasActiveDoctors(id),
        this.hasFutureAppointments(id),
      ]);

      if (activeDoctors > 0) {
        throw new ClinicUpdateNotAllowedException(
          'No se puede actualizar el ubigeo de una clínica con doctores activos asignados.',
          { activeDoctors },
        );
      }

      if (futureAppointments > 0) {
        throw new ClinicUpdateNotAllowedException(
          'No se puede actualizar el ubigeo mientras existan citas futuras programadas.',
          { futureAppointments },
        );
      }
    }

    if (Object.keys(restUpdate).length === 0) {
      return clinic;
    }

    return this.prisma.clinic.update({ where: { id }, data: restUpdate });
  }

  async deleteClinic(id: string) {
    return this.deactivateClinic(id);
  }

  async canDeactivateClinic(id: string): Promise<CanDeactivateClinicResponse> {
    const [activeDoctors, activeRooms, futureAppointments] = await Promise.all([
      this.hasActiveDoctors(id),
      this.hasActiveRooms(id),
      this.hasFutureAppointments(id),
    ]);

    const reasons: string[] = [];
    const warnings: string[] = [];

    if (activeDoctors > 0) {
      reasons.push(`La clínica tiene ${activeDoctors} doctor(es) activo(s).`);
    }

    if (activeRooms > 0) {
      reasons.push(`La clínica tiene ${activeRooms} sala(s) activa(s).`);
    }

    if (futureAppointments > 0) {
      reasons.push(
        `La clínica posee ${futureAppointments} cita(s) futura(s) pendientes o confirmadas.`,
      );
    }

    return {
      canDeactivate: reasons.length === 0,
      reasons,
      warnings,
      metadata: {
        activeDoctors,
        activeRooms,
        futureAppointments,
      },
    };
  }

  private async hasActiveDoctors(clinicId: string): Promise<number> {
    return this.prisma.doctor.count({
      where: { clinicId, isActive: true },
    });
  }

  private async hasActiveRooms(clinicId: string): Promise<number> {
    return this.prisma.room.count({
      where: { clinicId, isActive: true },
    });
  }

  private async hasFutureAppointments(clinicId: string): Promise<number> {
    return this.prisma.appointment.count({
      where: {
        doctor: { clinicId },
        slot: { startAt: { gte: new Date() } },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });
  }

  async reactivateClinic(id: string) {
    const clinic = await this.getClinicById(id);

    if (clinic.isActive) {
      throw new ClinicUpdateNotAllowedException(
        'La clínica ya se encuentra activa',
      );
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.clinic.update({
        where: { id },
        data: { isActive: true },
      }),
      this.prisma.room.updateMany({
        where: { clinicId: id },
        data: { isActive: true },
      }),
      this.prisma.doctor.updateMany({
        where: { clinicId: id },
        data: { isActive: true },
      }),
      this.prisma.user.updateMany({
        where: { doctor: { clinicId: id } },
        data: { isActive: true },
      }),
      this.prisma.schedule.updateMany({
        where: {
          doctor: { clinicId: id },
        },
        data: { isActive: true },
      }),
      this.prisma.slot.updateMany({
        where: {
          schedule: { doctor: { clinicId: id } },
          startAt: { gte: now },
          status: SlotStatus.BLOCKED,
        },
        data: { status: SlotStatus.FREE, isActive: true },
      }),
    ]);

    return this.getClinicById(id);
  }

  async deactivateClinic(id: string) {
    const clinic = await this.getClinicById(id);

    if (!clinic.isActive) {
      throw new ClinicCannotBeDeactivatedException([], {
        reason: 'already_inactive',
      });
    }

    const validation = await this.canDeactivateClinic(id);

    if (!validation.canDeactivate) {
      throw new ClinicCannotBeDeactivatedException(
        validation.reasons,
        validation.metadata,
      );
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.clinic.update({
        where: { id },
        data: { isActive: false },
      }),
      this.prisma.room.updateMany({
        where: { clinicId: id },
        data: { isActive: false },
      }),
      this.prisma.doctor.updateMany({
        where: { clinicId: id },
        data: { isActive: false },
      }),
      this.prisma.user.updateMany({
        where: { doctor: { clinicId: id } },
        data: { isActive: false },
      }),
      this.prisma.schedule.updateMany({
        where: {
          doctor: { clinicId: id },
        },
        data: { isActive: false },
      }),
      this.prisma.slot.updateMany({
        where: {
          schedule: { doctor: { clinicId: id } },
          startAt: { gte: now },
        },
        data: { status: SlotStatus.BLOCKED, isActive: false },
      }),
    ]);

    return this.getClinicById(id);
  }

  private normalizeClinicPayload(
    dto: Partial<CreateClinicDto>,
  ): NormalizedClinicPayload {
    const normalizeString = (
      value?: string,
      transform?: (val: string) => string,
    ): string | undefined => {
      if (typeof value !== 'string') {
        return undefined;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }
      return transform ? transform(trimmed) : trimmed;
    };

    const normalizeNullableString = (
      value?: string | null,
      transform?: (val: string) => string,
    ): string | null | undefined => {
      if (value === null) {
        return null;
      }
      return normalizeString(value, transform);
    };

    const toUpper = (val: string) => val.toUpperCase();
    const toLower = (val: string) => val.toLowerCase();

    const payload: NormalizedClinicPayload = {};

    if (dto.name !== undefined) {
      payload.name = normalizeString(dto.name);
    }
    if (dto.address !== undefined) {
      payload.address = normalizeString(dto.address);
    }
    if (dto.ubigeoDept !== undefined) {
      payload.ubigeoDept = normalizeString(dto.ubigeoDept, toUpper);
    }
    if (dto.ubigeoProv !== undefined) {
      payload.ubigeoProv = normalizeString(dto.ubigeoProv, toUpper);
    }
    if (dto.ubigeoDist !== undefined) {
      payload.ubigeoDist = normalizeString(dto.ubigeoDist, toUpper);
    }
    if (dto.phone !== undefined) {
      payload.phone = normalizeNullableString(dto.phone);
    }
    if (dto.email !== undefined) {
      payload.email = normalizeNullableString(dto.email, toLower);
    }
    if (dto.isActive !== undefined) {
      payload.isActive = dto.isActive;
    }

    return payload;
  }
}
