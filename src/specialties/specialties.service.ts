import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { QuerySpecialtyDto } from './dto/query-specialty.dto';
import {
  SpecialtyResponseDto,
  CanDeactivateResponseDto,
} from './dto/specialty-response.dto';
import {
  SpecialtyNotFoundException,
  SpecialtyAlreadyExistsException,
  SpecialtyCannotBeDeletedException,
} from './exceptions/specialty.exceptions';

@Injectable()
export class SpecialtiesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 📋 Listar especialidades con paginación y filtros
   */
  async listSpecialties(query?: QuerySpecialtyDto): Promise<{
    data: SpecialtyResponseDto[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const {
      search,
      isActive,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 10,
    } = query || {};

    // Construir filtros
    const where: any = {};

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Contar total
    const total = await this.prisma.specialty.count({ where });

    // Calcular paginación
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Obtener datos
    const specialties = await this.prisma.specialty.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: {
            doctors: true,
          },
        },
      },
    });

    // Obtener conteos adicionales
    const data = await Promise.all(
      specialties.map(async (specialty) => {
        const activeDoctorsCount = await this.prisma.doctor.count({
          where: {
            specialtyId: specialty.id,
            user: {
              isActive: true,
            },
          },
        });

        const upcomingAppointmentsCount = await this.prisma.appointment.count({
          where: {
            doctor: {
              specialtyId: specialty.id,
            },
            slot: {
              startAt: {
                gte: new Date(),
              },
            },
            status: {
              in: ['PENDING', 'CONFIRMED'],
            },
          },
        });

        return {
          id: specialty.id,
          name: specialty.name,
          description: specialty.description,
          isActive: specialty.isActive,
          createdAt: specialty.createdAt,
          updatedAt: specialty.updatedAt,
          doctorsCount: specialty._count.doctors,
          activeDoctorsCount,
          upcomingAppointmentsCount,
        };
      }),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * 🔍 Obtener especialidad por ID
   */
  async getSpecialtyById(id: string): Promise<SpecialtyResponseDto> {
    const specialty = await this.prisma.specialty.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            doctors: true,
          },
        },
      },
    });

    if (!specialty) {
      throw new SpecialtyNotFoundException(id);
    }

    const activeDoctorsCount = await this.prisma.doctor.count({
      where: {
        specialtyId: id,
        user: {
          isActive: true,
        },
      },
    });

    const upcomingAppointmentsCount = await this.prisma.appointment.count({
      where: {
        doctor: {
          specialtyId: id,
        },
        slot: {
          startAt: {
            gte: new Date(),
          },
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
    });

    return {
      id: specialty.id,
      name: specialty.name,
      description: specialty.description,
      isActive: specialty.isActive,
      createdAt: specialty.createdAt,
      updatedAt: specialty.updatedAt,
      doctorsCount: specialty._count.doctors,
      activeDoctorsCount,
      upcomingAppointmentsCount,
    };
  }

  /**
   * ✅ Crear nueva especialidad
   */
  async createSpecialty(
    dto: CreateSpecialtyDto,
  ): Promise<SpecialtyResponseDto> {
    // Validar nombre único (case-insensitive)
    const existing = await this.prisma.specialty.findFirst({
      where: {
        name: {
          equals: dto.name,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new SpecialtyAlreadyExistsException(dto.name);
    }

    // Crear especialidad
    const specialty = await this.prisma.specialty.create({
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
      include: {
        _count: {
          select: {
            doctors: true,
          },
        },
      },
    });

    return {
      id: specialty.id,
      name: specialty.name,
      description: specialty.description,
      isActive: specialty.isActive,
      createdAt: specialty.createdAt,
      updatedAt: specialty.updatedAt,
      doctorsCount: specialty._count.doctors,
      activeDoctorsCount: 0,
      upcomingAppointmentsCount: 0,
    };
  }

  /**
   * 🔄 Actualizar especialidad
   */
  async updateSpecialty(
    id: string,
    dto: UpdateSpecialtyDto,
  ): Promise<SpecialtyResponseDto> {
    // Verificar existencia
    await this.getSpecialtyById(id);

    // Si cambia el nombre, validar unicidad
    if (dto.name) {
      const duplicate = await this.prisma.specialty.findFirst({
        where: {
          name: {
            equals: dto.name,
            mode: 'insensitive',
          },
          id: {
            not: id,
          },
        },
      });

      if (duplicate) {
        throw new SpecialtyAlreadyExistsException(dto.name);
      }
    }

    // Actualizar (el guard ya validó si se puede desactivar)
    const updated = await this.prisma.specialty.update({
      where: { id },
      data: dto,
      include: {
        _count: {
          select: {
            doctors: true,
          },
        },
      },
    });

    const activeDoctorsCount = await this.prisma.doctor.count({
      where: {
        specialtyId: id,
        user: {
          isActive: true,
        },
      },
    });

    const upcomingAppointmentsCount = await this.prisma.appointment.count({
      where: {
        doctor: {
          specialtyId: id,
        },
        slot: {
          startAt: {
            gte: new Date(),
          },
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      doctorsCount: updated._count.doctors,
      activeDoctorsCount,
      upcomingAppointmentsCount,
    };
  }

  /**
   * 🗑️ Eliminar especialidad (solo si no tiene dependencias)
   */
  // async removeSpecialty(id: string): Promise<SpecialtyResponseDto> {
  //   const specialty = await this.getSpecialtyById(id);

  //   const reasons: string[] = [];

  //   // Validar que no tenga doctores
  //   if (specialty.doctorsCount > 0) {
  //     reasons.push(
  //       `No se puede eliminar porque tiene ${specialty.doctorsCount} doctor(es) asociado(s)`,
  //     );
  //   }

  //   // Validar que no tenga citas históricas
  //   const historicalAppointments = await this.prisma.appointment.count({
  //     where: {
  //       doctor: {
  //         specialtyId: id,
  //       },
  //     },
  //   });

  //   if (historicalAppointments > 0) {
  //     reasons.push(
  //       `No se puede eliminar porque tiene ${historicalAppointments} cita(s) histórica(s) registrada(s)`,
  //     );
  //   }

  //   if (reasons.length > 0) {
  //     throw new SpecialtyCannotBeDeletedException(reasons);
  //   }

  //   // Eliminar
  //   const deleted = await this.prisma.specialty.delete({
  //     where: { id },
  //   });

  //   return {
  //     id: deleted.id,
  //     name: deleted.name,
  //     description: deleted.description,
  //     isActive: deleted.isActive,
  //     createdAt: deleted.createdAt,
  //     updatedAt: deleted.updatedAt,
  //     doctorsCount: 0,
  //     activeDoctorsCount: 0,
  //     upcomingAppointmentsCount: 0,
  //   };
  // }

  /**
   * 📊 Verificar si se puede desactivar (para UI)
   */
  async canDeactivate(id: string): Promise<CanDeactivateResponseDto> {
    await this.getSpecialtyById(id);

    const reasons: string[] = [];
    const warnings: string[] = [];

    // Contar doctores activos
    const activeDoctors = await this.prisma.doctor.count({
      where: {
        specialtyId: id,
        user: {
          isActive: true,
        },
      },
    });

    const totalDoctors = await this.prisma.doctor.count({
      where: { specialtyId: id },
    });

    if (activeDoctors > 0) {
      reasons.push(`Tiene ${activeDoctors} doctor(es) activo(s) asociado(s)`);
    }

    // Contar citas futuras
    const upcomingAppointments = await this.prisma.appointment.count({
      where: {
        doctor: {
          specialtyId: id,
        },
        slot: {
          startAt: {
            gte: new Date(),
          },
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
    });

    if (upcomingAppointments > 0) {
      reasons.push(
        `Tiene ${upcomingAppointments} cita(s) futura(s) programada(s)`,
      );
    }

    // Advertencias
    if (totalDoctors > activeDoctors) {
      warnings.push(
        `Tiene ${totalDoctors - activeDoctors} doctor(es) inactivo(s) también asociados`,
      );
    }

    return {
      canDeactivate: reasons.length === 0,
      reasons,
      warnings,
      metadata: {
        totalDoctors,
        activeDoctors,
        upcomingAppointments,
      },
    };
  }
}
