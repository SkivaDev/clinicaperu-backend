import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HashingService } from 'src/common/hashing/hashing.service';
import {
  PublicDoctorListDto,
  PublicDoctorDetailDto,
} from './dto/public-doctor.dto';
import {
  DoctorStatisticsDto,
  DateRangeEnum,
  CurrentMonthMetricsDto,
  HistoricalMetricsDto,
  GeneralMetricsDto,
  MonthlyDataDto,
  MonthlyNoShowRateDto,
  UpcomingAppointmentDto,
} from './dto/doctor-statistics.dto';
import { S3Service } from 'src/common/s3/s3.service';
import { QueryDoctorDto, DoctorSortBy } from './dto/query-doctor.dto';
import {
  CanDeactivateDoctorResponseDto,
  DoctorResponseDto,
} from './dto/doctor-response.dto';
import {
  DoctorAlreadyExistsException,
  DoctorCannotBeDeactivatedException,
  DoctorNotFoundException,
} from './exceptions/doctor.exceptions';

@Injectable()
export class DoctorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService,
    private readonly s3Service: S3Service,
  ) {}

  // METODO DE CREAR DOCTOR ANTIGUO
  // async createDoctor(dto: CreateUserDto & CreateDoctorDto) {
  //   try {
  //     // 1. Validar duplicados básicos (dni, email, cmp)
  //     const existingUser = await this.prisma.user.findFirst({
  //       where: { OR: [{ dni: dto.dni }, { email: dto.email }] },
  //     });
  //     if (existingUser) {
  //       throw new ConflictException('Email o DNI ya están registrados');
  //     }

  //     const existingCmp = await this.prisma.doctor.findUnique({
  //       where: { cmp: dto.cmp },
  //     });
  //     if (existingCmp) {
  //       throw new ConflictException('CMP ya está registrado');
  //     }

  //     // 2. Hashear password
  //     const hashedPassword = await this.hashingService.hash(dto.password);

  //     // 3. Crear User + Doctor en una transacción
  //     const result = await this.prisma.$transaction(async (tx) => {
  //       const user = await tx.user.create({
  //         data: {
  //           dni: dto.dni,
  //           email: dto.email,
  //           passwordHash: hashedPassword,
  //           firstName: dto.firstName,
  //           lastName: dto.lastName,
  //           dayOfBirth: new Date(dto.dayOfBirth),
  //           phone: dto.phone,
  //           gender: dto.gender,
  //           role: 'DOCTOR',
  //         },
  //       });

  //       const doctor = await tx.doctor.create({
  //         data: {
  //           cmp: dto.cmp,
  //           isActive: dto.isActive,
  //           yearsOfExperience: dto.yearsOfExperience,
  //           consultationPrice: dto.consultationPrice,
  //           clinic: { connect: { id: dto.clinicId } },
  //           specialty: { connect: { id: dto.specialtyId } },
  //           user: { connect: { id: user.id } },
  //         },
  //       });

  //       //retornar sin el passwordHash
  //       // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //       const { passwordHash: _, ...userWithoutPassword } = user;
  //       return { ...doctor, user: userWithoutPassword };
  //     });

  //     return result;
  //   } catch (error) {
  //     console.error(error);
  //     throw new InternalServerErrorException('Error al registrar al doctor');
  //   }
  // }

  // ===========================================================================
  // CREAR DOCTOR (User + Doctor)
  // ===========================================================================
  async createDoctor(dto: CreateDoctorDto): Promise<DoctorResponseDto> {
    // CMP único
    const existingCMP = await this.prisma.doctor.findFirst({
      where: { cmp: dto.cmp },
    });

    if (existingCMP) {
      throw new DoctorAlreadyExistsException('cmp', dto.cmp);
    }

    // Validar especialidad/clínica activas
    const specialty = await this.prisma.specialty.findUnique({
      where: { id: dto.specialtyId },
    });

    if (!specialty || !specialty.isActive) {
      throw new HttpException(
        'La especialidad no es válida o está inactiva',
        HttpStatus.BAD_REQUEST,
      );
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });

    if (!clinic || !clinic.isActive) {
      throw new HttpException(
        'La clínica no es válida o está inactiva',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Crear usuario
    const passwordHash = await this.hashingService.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        dni: dto.dni,
        phone: dto.phone,
        gender: dto.gender,
        dayOfBirth: new Date(dto.dayOfBirth),
        role: Role.DOCTOR,
        isActive: dto.isActive ?? true,
        passwordHash,
      },
    });

    // Crear doctor
    const doctor = await this.prisma.doctor.create({
      data: {
        cmp: dto.cmp,
        consultationPrice: dto.consultationPrice,
        yearsOfExperience: dto.yearsOfExperience,
        specialtyId: dto.specialtyId,
        clinicId: dto.clinicId,
        userId: user.id,
      },
    });

    return this.getDoctorById(doctor.id);
  }

  // OBTENER DOCTOR POR ID ANTIGUO
  // async getDoctorDetail(id: string) {
  //   const doctor = await this.prisma.doctor.findUnique({
  //     where: { id },
  //     include: { user: true, clinic: true, specialty: true, schedules: true },
  //   });
  //   if (!doctor) throw new NotFoundException('Doctor not found');

  //   // Excluir passwordHash del usuario
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   const { passwordHash, ...userWithoutPassword } = doctor.user;

  //   // Generar URL prefirmada de S3 para la imagen de perfil
  //   const profileImageUrl = await this.generateProfileImageUrl(
  //     userWithoutPassword.profileImage,
  //   );

  //   return {
  //     ...doctor,
  //     user: { ...userWithoutPassword, profileImage: profileImageUrl },
  //   };
  // }

  // ===========================================================================
  // OBTENER DOCTOR POR ID
  // ===========================================================================
  async getDoctorById(id: string): Promise<DoctorResponseDto> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: true,
        specialty: true,
        clinic: true,
        schedules: true,
        appointments: true,
      },
    });

    if (!doctor) throw new DoctorNotFoundException(id);

    const upcomingAppointments = await this.prisma.appointment.count({
      where: {
        doctorId: id,
        slot: {
          startAt: { gte: new Date() },
        },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    const activeSchedules = await this.prisma.schedule.count({
      where: { doctorId: id, isActive: true },
    });

    const availableSlots = await this.prisma.slot.count({
      where: {
        schedule: { doctorId: id },
        isActive: true,
        startAt: { gte: new Date() },
        status: 'FREE',
      },
    });

    return {
      id: doctor.id,
      cmp: doctor.cmp,
      isActive: doctor.isActive,
      yearsOfExperience: doctor.yearsOfExperience,
      consultationPrice: doctor.consultationPrice,
      rating: doctor.rating,
      attendedAppointments: doctor.attendedAppointments,
      attendedPatients: doctor.attendedPatients,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,

      user: {
        id: doctor.user.id,
        firstName: doctor.user.firstName,
        lastName: doctor.user.lastName,
        dni: doctor.user.dni,
        phone: doctor.user.phone,
        email: doctor.user.email,
        gender: doctor.user.gender,
        dayOfBirth: doctor.user.dayOfBirth,
        profileImage: doctor.user.profileImage,
        isActive: doctor.user.isActive,
      },

      specialty: {
        id: doctor.specialty.id,
        name: doctor.specialty.name,
      },

      clinic: {
        id: doctor.clinic.id,
        name: doctor.clinic.name,
      },

      schedulesCount: doctor.schedules.length,
      appointmentsCount: doctor.appointments.length,
      activeSchedulesCount: activeSchedules,
      upcomingAppointmentsCount: upcomingAppointments,
      availableSlotsCount: availableSlots,
    };
  }

  // async getDoctorStats(id: string) {
  //   const doctor = await this.prisma.doctor.findUnique({
  //     where: { id },
  //   });
  //   if (!doctor) throw new NotFoundException('Doctor not found');
  //   return {

  //   };
  // }

  async getDoctorIds(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        clinicId: true,
        specialtyId: true,
      },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  // async updateDoctor(id: string, dto: UpdateDoctorDto) {
  //   await this.getDoctorIds(id);
  //   return this.prisma.doctor.update({
  //     where: { id },
  //     data: {
  //       cmp: dto.cmp,
  //       clinic: dto.clinicId ? { connect: { id: dto.clinicId } } : undefined,
  //       specialty: dto.specialtyId
  //         ? { connect: { id: dto.specialtyId } }
  //         : undefined,
  //     },
  //   });
  // }

  // TODO: Update Doctor METODO ANTIGUO
  // async updateDoctor(id: string, dto: UpdateUserDto & UpdateDoctorDto) {
  //   // Verificar existencia
  //   const doctor = await this.prisma.doctor.findUnique({
  //     where: { id },
  //     include: { user: true },
  //   });
  //   if (!doctor) {
  //     throw new NotFoundException('Doctor no encontrado');
  //   }

  //   // Si hay password, hashearlo
  //   let passwordHash: string | undefined;
  //   if (dto.password) {
  //     passwordHash = await this.hashingService.hash(dto.password);
  //   }

  //   // Actualizar en transacción
  //   const result = await this.prisma.$transaction(async (tx) => {
  //     const updatedUser = await tx.user.update({
  //       where: { id: doctor.userId },
  //       data: {
  //         dni: dto.dni,
  //         email: dto.email,
  //         firstName: dto.firstName,
  //         lastName: dto.lastName,
  //         phone: dto.phone,
  //         gender: dto.gender,
  //         dayOfBirth: dto.dayOfBirth ? new Date(dto.dayOfBirth) : undefined,
  //         ...(passwordHash && { passwordHash }),
  //       },
  //     });

  //     const updatedDoctor = await tx.doctor.update({
  //       where: { id },
  //       data: {
  //         cmp: dto.cmp,
  //         isActive: dto.isActive,
  //         yearsOfExperience: dto.yearsOfExperience,
  //         consultationPrice: dto.consultationPrice,
  //         clinic: dto.clinicId ? { connect: { id: dto.clinicId } } : undefined,
  //         specialty: dto.specialtyId
  //           ? { connect: { id: dto.specialtyId } }
  //           : undefined,
  //       },
  //     });

  //     // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //     const { passwordHash: _, ...userWithoutPassword } = updatedUser;
  //     return { ...updatedDoctor, user: userWithoutPassword };
  //   });

  //   // Generar URL prefirmada de S3 para la imagen de perfil
  //   const profileImageUrl = await this.generateProfileImageUrl(
  //     result.user.profileImage,
  //   );

  //   return {
  //     ...result,
  //     user: { ...result.user, profileImage: profileImageUrl },
  //   };
  // }

  // ===========================================================================
  // ACTUALIZAR DOCTOR
  // ===========================================================================
  async updateDoctor(
    id: string,
    dto: UpdateDoctorDto,
  ): Promise<DoctorResponseDto> {
    const doctor = await this.getDoctorById(id);

    // Validar CMP único si lo cambia
    if (dto.cmp && dto.cmp !== doctor.cmp) {
      const exists = await this.prisma.doctor.findFirst({
        where: { cmp: dto.cmp },
      });
      if (exists) {
        throw new DoctorAlreadyExistsException('cmp', dto.cmp);
      }
    }

    // Validar que NO cambie de especialidad si tiene citas futuras
    if (dto.specialtyId && dto.specialtyId !== doctor.specialty.id) {
      const futureAppointments = await this.prisma.appointment.count({
        where: {
          doctorId: id,
          slot: { startAt: { gte: new Date() } },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      });

      if (futureAppointments > 0) {
        throw new HttpException(
          'No se puede cambiar la especialidad porque tiene citas futuras programadas',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Validar especialidad y clínica activas
    if (dto.specialtyId) {
      const specialty = await this.prisma.specialty.findUnique({
        where: { id: dto.specialtyId },
      });
      if (!specialty?.isActive)
        throw new HttpException(
          'La especialidad seleccionada no es válida o está inactiva',
          HttpStatus.BAD_REQUEST,
        );
    }

    if (dto.clinicId) {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: dto.clinicId },
      });
      if (!clinic?.isActive)
        throw new HttpException(
          'La clínica seleccionada no es válida o está inactiva',
          HttpStatus.BAD_REQUEST,
        );
    }

    // Actualizar doctor + usuario
    await this.prisma.user.update({
      where: { id: doctor.user.id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.dni !== undefined && { dni: dto.dni }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.dayOfBirth !== undefined && {
          dayOfBirth: new Date(dto.dayOfBirth),
        }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.profileImage !== undefined && {
          profileImage: dto.profileImage,
        }),
      },
    });

    // Actualizar solo los campos que pertenecen a Doctor
    const doctorData: any = {};
    if (dto.cmp !== undefined) doctorData.cmp = dto.cmp;
    if (dto.isActive !== undefined) doctorData.isActive = dto.isActive;
    if (dto.yearsOfExperience !== undefined)
      doctorData.yearsOfExperience = dto.yearsOfExperience;
    if (dto.consultationPrice !== undefined)
      doctorData.consultationPrice = dto.consultationPrice;
    if (dto.specialtyId !== undefined) doctorData.specialtyId = dto.specialtyId;
    if (dto.clinicId !== undefined) doctorData.clinicId = dto.clinicId;

    if (Object.keys(doctorData).length > 0) {
      await this.prisma.doctor.update({
        where: { id },
        data: doctorData,
      });
    }

    return this.getDoctorById(id);
  }

  // async deleteDoctor(id: string) {
  //   await this.getDoctorIds(id);
  //   const doctor = await this.prisma.doctor.delete({
  //     where: { id },
  //     include: { user: true },
  //   });

  //   // Excluir passwordHash del usuario
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   const { passwordHash, ...userWithoutPassword } = doctor.user;

  //   // Generar URL prefirmada de S3 para la imagen de perfil
  //   const profileImageUrl = await this.generateProfileImageUrl(
  //     userWithoutPassword.profileImage,
  //   );

  //   return {
  //     ...doctor,
  //     user: { ...userWithoutPassword, profileImage: profileImageUrl },
  //   };
  // }

  // async listDoctors() {
  //   const doctors = await this.prisma.doctor.findMany({
  //     include: { user: true, clinic: true, specialty: true },
  //   });

  //   // Excluir passwordHash de cada usuario y generar URLs de S3
  //   return Promise.all(
  //     doctors.map(async (doctor) => {
  //       // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //       const { passwordHash, ...userWithoutPassword } = doctor.user;

  //       // Generar URL prefirmada de S3 para la imagen de perfil
  //       const profileImageUrl = await this.generateProfileImageUrl(
  //         userWithoutPassword.profileImage,
  //       );

  //       return {
  //         ...doctor,
  //         user: { ...userWithoutPassword, profileImage: profileImageUrl },
  //       };
  //     }),
  //   );
  // }

  /**
   * Listar doctores con filtros avanzados, paginación y estadísticas
   */
  async listDoctors(query?: QueryDoctorDto): Promise<{
    data: DoctorResponseDto[];
    stats: any;
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
      cmp,
      specialtyId,
      clinicId,
      isActive,
      sortBy = 'lastName',
      sortOrder = 'asc',
      page = 1,
      limit = 10,
    } = query || {};

    // -------------------------------------------------------
    // 1. Construir filtros
    // -------------------------------------------------------
    const where: Prisma.DoctorWhereInput = {};

    if (cmp) {
      where.cmp = Number(cmp);
    }

    if (specialtyId) {
      where.specialtyId = specialtyId;
    }

    if (clinicId) {
      where.clinicId = clinicId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      const orFilters: Prisma.DoctorWhereInput[] = [
        {
          user: {
            firstName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            lastName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];

      const searchAsNumber = Number(search);
      if (!Number.isNaN(searchAsNumber)) {
        orFilters.push({
          cmp: {
            equals: searchAsNumber,
          },
        });
      }

      where.OR = orFilters;
    }

    // -------------------------------------------------------
    // 2. Contar total
    // -------------------------------------------------------
    const total = await this.prisma.doctor.count({ where });

    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // -------------------------------------------------------
    // 3. Obtener doctores + _count
    // -------------------------------------------------------
    let orderBy: Prisma.DoctorOrderByWithRelationInput;

    if (sortBy === DoctorSortBy.FIRST_NAME) {
      orderBy = { user: { firstName: sortOrder } };
    } else if (sortBy === DoctorSortBy.LAST_NAME) {
      orderBy = { user: { lastName: sortOrder } };
    } else {
      orderBy = {
        [sortBy]: sortOrder,
      } as Prisma.DoctorOrderByWithRelationInput;
    }

    const doctors = await this.prisma.doctor.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        specialty: true,
        clinic: true,
        user: true,
        _count: {
          select: {
            schedules: true,
            appointments: true,
          },
        },
      },
    });

    // -------------------------------------------------------
    // 4. Calcular datos derivados (Asíncrono por cada doctor)
    // -------------------------------------------------------
    const data = await Promise.all(
      doctors.map(async (doctor) => {
        // Citas futuras activas
        const upcomingAppointments = await this.prisma.appointment.count({
          where: {
            doctorId: doctor.id,
            slot: {
              startAt: {
                gte: new Date(),
              },
            },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        });

        // Slots disponibles FREE
        const availableSlots = await this.prisma.slot.count({
          where: {
            schedule: { doctorId: doctor.id },
            startAt: { gte: new Date() },
            status: 'FREE',
            isActive: true,
          },
        });

        // Horarios activos
        const activeSchedules = await this.prisma.schedule.count({
          where: {
            doctorId: doctor.id,
            isActive: true,
          },
        });

        // Construcción final
        return {
          id: doctor.id,
          cmp: doctor.cmp,
          isActive: doctor.isActive,
          yearsOfExperience: doctor.yearsOfExperience,
          consultationPrice: doctor.consultationPrice,
          attendedAppointments: doctor.attendedAppointments,
          attendedPatients: doctor.attendedPatients,
          rating: doctor.rating,
          createdAt: doctor.createdAt,
          updatedAt: doctor.updatedAt,

          // Relaciones
          specialty: {
            id: doctor.specialty.id,
            name: doctor.specialty.name,
          },
          clinic: {
            id: doctor.clinic.id,
            name: doctor.clinic.name,
          },
          user: {
            id: doctor.user.id,
            firstName: doctor.user.firstName,
            lastName: doctor.user.lastName,
            email: doctor.user.email,
            dni: doctor.user.dni,
            phone: doctor.user.phone,
            gender: doctor.user.gender,
            dayOfBirth: doctor.user.dayOfBirth,
            profileImage: doctor.user.profileImage,
            isActive: doctor.user.isActive,
          },

          // Conteos adicionales
          schedulesCount: doctor._count.schedules,
          appointmentsCount: doctor._count.appointments,
          activeSchedulesCount: activeSchedules,
          upcomingAppointmentsCount: upcomingAppointments,
          availableSlotsCount: availableSlots,
        };
      }),
    );

    // -------------------------------------------------------
    // 5. Estadísticas globales del módulo Doctor
    // -------------------------------------------------------
    const totalDoctors = await this.prisma.doctor.count();
    const activeDoctors = await this.prisma.doctor.count({
      where: { isActive: true },
    });
    const inactiveDoctors = totalDoctors - activeDoctors;
    const totalPatients = await this.prisma.appointment.count({
      where: {
        doctor: {
          user: {
            isActive: true,
          },
        },
      },
    });
    const totalAppointments = await this.prisma.appointment.count({
      where: {
        status: {
          in: ['PENDING', 'CONFIRMED', 'ATTENDED'],
        },
      },
    });

    return {
      data,
      stats: {
        totalDoctors,
        activeDoctors,
        inactiveDoctors,
        totalPatients,
        totalAppointments,
      },
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

  // ===========================================================================
  // CAN DEACTIVATE (UI)
  // ===========================================================================
  async canDeactivate(id: string): Promise<CanDeactivateDoctorResponseDto> {
    await this.getDoctorById(id);

    const reasons: string[] = [];
    const warnings: string[] = [];

    const upcomingAppointments = await this.prisma.appointment.count({
      where: {
        doctorId: id,
        slot: { startAt: { gte: new Date() } },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (upcomingAppointments > 0) {
      reasons.push(`Tiene ${upcomingAppointments} cita(s) futura(s).`);
    }

    const activeSchedules = await this.prisma.schedule.count({
      where: { doctorId: id, isActive: true },
    });

    if (activeSchedules > 0) {
      warnings.push(`Se desactivarán ${activeSchedules} horario(s) activos.`);
    }

    const activeSlots = await this.prisma.slot.count({
      where: {
        schedule: { doctorId: id },
        isActive: true,
        startAt: { gte: new Date() },
        status: { in: ['FREE', 'HELD', 'BOOKED'] },
      },
    });

    if (activeSlots > 0) {
      reasons.push(
        `Tiene ${activeSlots} slots futuros en FREE / HELD / BOOKED.`,
      );
    }

    return {
      canDeactivate: reasons.length === 0,
      reasons,
      warnings,
      metadata: {
        upcomingAppointments,
        activeSchedules,
        availableSlots: activeSlots,
      },
    };
  }

  // ===========================================================================
  // 🔒 DESACTIVAR DOCTOR (estricto)
  // ===========================================================================
  async deactivateDoctor(id: string): Promise<DoctorResponseDto> {
    const doctor = await this.getDoctorById(id);

    if (!doctor.isActive) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'El doctor ya está desactivado',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const validation = await this.canDeactivate(id);

    if (!validation.canDeactivate) {
      throw new DoctorCannotBeDeactivatedException(
        validation.reasons,
        validation.metadata,
      );
    }

    // Desactivar doctor + usuario asociado
    await this.prisma.$transaction([
      this.prisma.doctor.update({
        where: { id },
        data: { isActive: false },
      }),
      this.prisma.user.update({
        where: { id: doctor.user.id },
        data: { isActive: false },
      }),
      this.prisma.schedule.updateMany({
        where: { doctorId: id },
        data: { isActive: false },
      }),
      this.prisma.slot.updateMany({
        where: {
          schedule: { doctorId: id },
          startAt: { gte: new Date() },
        },
        data: { isActive: false },
      }),
    ]);

    return this.getDoctorById(id);
  }

  async listDoctorsByClinic(clinicId: string) {
    const doctors = await this.prisma.doctor.findMany({
      where: { clinicId },
      include: { user: true, specialty: true },
    });

    // Excluir passwordHash de cada usuario y generar URLs de S3
    return Promise.all(
      doctors.map(async (doctor) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...userWithoutPassword } = doctor.user;

        // Generar URL prefirmada de S3 para la imagen de perfil
        const profileImageUrl = await this.generateProfileImageUrl(
          userWithoutPassword.profileImage,
        );

        return {
          ...doctor,
          user: { ...userWithoutPassword, profileImage: profileImageUrl },
        };
      }),
    );
  }

  async listDoctorsBySpecialty(specialtyId: string) {
    const doctors = await this.prisma.doctor.findMany({
      where: { specialtyId },
      include: { user: true, clinic: true },
    });

    // Excluir passwordHash de cada usuario y generar URLs de S3
    return Promise.all(
      doctors.map(async (doctor) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...userWithoutPassword } = doctor.user;

        // Generar URL prefirmada de S3 para la imagen de perfil
        const profileImageUrl = await this.generateProfileImageUrl(
          userWithoutPassword.profileImage,
        );

        return {
          ...doctor,
          user: { ...userWithoutPassword, profileImage: profileImageUrl },
        };
      }),
    );
  }

  /**
   * Helper: Genera URL prefirmada de S3 para profileImage
   * Si la imagen no existe o falla, retorna null
   */
  private async generateProfileImageUrl(
    profileImage: string | null,
  ): Promise<string | null> {
    if (!profileImage) {
      return null;
    }

    try {
      // Generar URL prefirmada con expiración de 1 hora (3600 segundos)
      const signedUrl = await this.s3Service.generateDownloadUrl(
        profileImage,
        3600,
      );
      return signedUrl;
    } catch {
      // Si falla, retornar null (la imagen no se mostrará)
      return null;
    }
  }

  // Métodos públicos para el controlador público
  async findPublicDoctors(params: {
    search?: string;
    specialtyId?: string;
    clinicId?: string;
    page: number;
    limit: number;
  }): Promise<{
    data: PublicDoctorListDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { search, specialtyId, clinicId, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      user: {
        isActive: true,
      },
    };

    if (search) {
      where.OR = [
        {
          user: {
            firstName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            lastName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    if (specialtyId) {
      where.specialtyId = specialtyId;
    }

    if (clinicId) {
      where.clinicId = clinicId;
    }

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where,
        include: {
          user: true,
          specialty: true,
          clinic: true,
          appointments: {
            select: {
              id: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          user: {
            firstName: 'asc',
          },
        },
      }),
      this.prisma.doctor.count({ where }),
    ]);

    // Generar estructura segura para la respuesta doctores publicos
    const data: PublicDoctorListDto[] = await Promise.all(
      doctors.map(async (doctor) => {
        return {
          id: doctor.id,
          cmp: doctor.cmp,
          yearsOfExperience: doctor.yearsOfExperience || null,
          consultationPrice: doctor.consultationPrice || null,
          attendedPatients: doctor.attendedPatients,
          rating: doctor.rating > 0 ? doctor.rating : undefined,
          user: {
            id: doctor.user.id,
            firstName: doctor.user.firstName,
            lastName: doctor.user.lastName,
            profileImage: doctor.user.profileImage,
            email: doctor.user.email,
            phone: doctor.user.phone || null,
          },
          specialty: {
            id: doctor.specialty.id,
            name: doctor.specialty.name,
          },
          clinic: {
            id: doctor.clinic.id,
            name: doctor.clinic.name,
          },
        };
      }),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPublicDoctorById(
    id: string,
  ): Promise<PublicDoctorDetailDto | null> {
    const doctor = await this.prisma.doctor.findUnique({
      where: {
        id,
        user: {
          isActive: true,
        },
      },
      include: {
        user: true,
        specialty: true,
        clinic: true,
        schedules: {
          where: {
            isActive: true,
          },
        },
        appointments: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!doctor) {
      return null;
    }

    const rating = doctor.rating > 0 ? doctor.rating : undefined;

    // Generar URL prefirmada de S3 para la imagen de perfil
    const profileImageUrl = await this.generateProfileImageUrl(
      doctor.user.profileImage,
    );

    return {
      id: doctor.id,
      cmp: doctor.cmp,
      yearsOfExperience: doctor.yearsOfExperience || null,
      consultationPrice: doctor.consultationPrice || null,
      attendedPatients: doctor.attendedPatients,
      rating,
      user: {
        id: doctor.user.id,
        firstName: doctor.user.firstName,
        lastName: doctor.user.lastName,
        profileImage: profileImageUrl,
        email: doctor.user.email,
        phone: doctor.user.phone || null,
      },

      specialty: {
        id: doctor.specialty.id,
        name: doctor.specialty.name,
      },
      clinic: {
        id: doctor.clinic.id,
        name: doctor.clinic.name,
      },
      // totalAppointments: doctor.appointments.length,
      schedules: doctor.schedules.map((schedule) => ({
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      })),
    };
  }

  /**
   * Obtiene estadísticas completas del doctor
   * Incluye métricas del mes actual, históricas y generales
   * Optimizado con queries SQL agregadas
   */
  async getStatistics(
    doctorId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dateRange: DateRangeEnum = DateRangeEnum.THIS_MONTH,
  ): Promise<DoctorStatisticsDto> {
    // Verificar que el doctor existe
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, consultationPrice: true, rating: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor no encontrado');
    }

    // Calcular fechas según el rango
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const endOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    // Obtener métricas del mes actual en paralelo
    const [currentMonthMetrics, previousMonthMetrics] = await Promise.all([
      this.getCurrentMonthMetrics(
        doctorId,
        startOfCurrentMonth,
        endOfCurrentMonth,
        doctor.consultationPrice,
      ),
      this.getCurrentMonthMetrics(
        doctorId,
        startOfPreviousMonth,
        endOfPreviousMonth,
        doctor.consultationPrice,
      ),
    ]);

    // Calcular variación vs mes anterior
    const variationVsPreviousMonth =
      previousMonthMetrics.totalAttended > 0
        ? ((currentMonthMetrics.totalAttended -
            previousMonthMetrics.totalAttended) /
            previousMonthMetrics.totalAttended) *
          100
        : 0;

    currentMonthMetrics.variationVsPreviousMonth = Number(
      variationVsPreviousMonth.toFixed(2),
    );

    // Obtener métricas históricas (últimos 6 meses)
    const historicalMetrics = await this.getHistoricalMetrics(doctorId);

    // Obtener métricas generales
    const generalMetrics = await this.getGeneralMetrics(
      doctorId,
      doctor.rating,
    );

    return {
      currentMonth: currentMonthMetrics,
      historical: historicalMetrics,
      general: generalMetrics,
      generatedAt: new Date(),
    };
  }

  /**
   * Calcula métricas del mes actual (o cualquier rango de fechas)
   * Usa queries optimizadas con agregaciones
   */
  private async getCurrentMonthMetrics(
    doctorId: string,
    startDate: Date,
    endDate: Date,
    consultationPrice: number | null,
  ): Promise<CurrentMonthMetricsDto> {
    // Query optimizada con agregaciones usando Prisma raw SQL
    const metricsResult = await this.prisma.$queryRaw<
      Array<{
        total_attended: bigint;
        total_cancelled: bigint;
        total_no_shows: bigint;
      }>
    >`
      SELECT 
        COUNT(CASE WHEN status = 'ATTENDED' THEN 1 END) as total_attended,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as total_cancelled,
        COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) as total_no_shows
      FROM "Appointment"
      WHERE "doctorId" = ${doctorId}
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
    `;

    const metrics = metricsResult[0];
    const totalAttended = Number(metrics.total_attended);
    const totalCancelled = Number(metrics.total_cancelled);
    const totalNoShows = Number(metrics.total_no_shows);

    // Calcular tasa de ocupación (slots booked / slots totales)
    const occupancyResult = await this.prisma.$queryRaw<
      Array<{
        total_slots: bigint;
        booked_slots: bigint;
      }>
    >`
      SELECT 
        COUNT(*) as total_slots,
        COUNT(CASE WHEN status IN ('BOOKED', 'HELD') THEN 1 END) as booked_slots
      FROM "Slot" s
      INNER JOIN "Schedule" sch ON s."scheduleId" = sch.id
      WHERE sch."doctorId" = ${doctorId}
        AND s."startAt" >= ${startDate}
        AND s."startAt" <= ${endDate}
        AND s."isActive" = true
    `;

    const occupancy = occupancyResult[0];
    const totalSlots = Number(occupancy.total_slots);
    const bookedSlots = Number(occupancy.booked_slots);
    const occupancyRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

    // Calcular ingresos estimados
    const estimatedRevenue = totalAttended * (consultationPrice || 0);

    return {
      totalAttended,
      totalCancelled,
      totalNoShows,
      occupancyRate: Number(occupancyRate.toFixed(2)),
      estimatedRevenue: Number(estimatedRevenue.toFixed(2)),
    };
  }

  /**
   * Obtiene métricas históricas de los últimos 6 meses
   */
  private async getHistoricalMetrics(
    doctorId: string,
  ): Promise<HistoricalMetricsDto> {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // Citas atendidas por mes
    const attendedByMonthResult = await this.prisma.$queryRaw<
      Array<{
        month: string;
        count: bigint;
      }>
    >`
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        COUNT(*) as count
      FROM "Appointment"
      WHERE "doctorId" = ${doctorId}
        AND status = 'ATTENDED'
        AND "createdAt" >= ${sixMonthsAgo}
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY month ASC
    `;

    const attendedByMonth: MonthlyDataDto[] = attendedByMonthResult.map(
      (row) => ({
        month: row.month,
        count: Number(row.count),
      }),
    );

    // Tasa de no-show por mes
    const noShowRateResult = await this.prisma.$queryRaw<
      Array<{
        month: string;
        total: bigint;
        no_shows: bigint;
      }>
    >`
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) as no_shows
      FROM "Appointment"
      WHERE "doctorId" = ${doctorId}
        AND "createdAt" >= ${sixMonthsAgo}
        AND status IN ('ATTENDED', 'NO_SHOW')
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY month ASC
    `;

    const noShowRateByMonth: MonthlyNoShowRateDto[] = noShowRateResult.map(
      (row) => {
        const total = Number(row.total);
        const noShows = Number(row.no_shows);
        const rate = total > 0 ? (noShows / total) * 100 : 0;
        return {
          month: row.month,
          rate: Number(rate.toFixed(2)),
        };
      },
    );

    return {
      attendedByMonth,
      noShowRateByMonth,
    };
  }

  /**
   * Obtiene métricas generales del doctor
   */
  private async getGeneralMetrics(
    doctorId: string,
    rating: number,
  ): Promise<GeneralMetricsDto> {
    // Total de pacientes únicos atendidos
    const uniquePatientsResult = await this.prisma.$queryRaw<
      Array<{
        unique_patients: bigint;
      }>
    >`
      SELECT COUNT(DISTINCT "userId") as unique_patients
      FROM "Appointment"
      WHERE "doctorId" = ${doctorId}
        AND status = 'ATTENDED'
    `;

    const totalUniquePatientsAttended = Number(
      uniquePatientsResult[0].unique_patients,
    );

    // Próximas citas (siguientes 7 días)
    const now = new Date();
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(now.getDate() + 7);

    const upcomingAppointmentsData = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        slot: {
          startAt: {
            gte: now,
            lte: sevenDaysLater,
          },
        },
      },
      include: {
        slot: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        slot: {
          startAt: 'asc',
        },
      },
      take: 10, // Limitar a 10 próximas citas
    });

    const upcomingAppointments: UpcomingAppointmentDto[] =
      upcomingAppointmentsData.map((appointment) => ({
        id: appointment.id,
        startAt: appointment.slot.startAt,
        endAt: appointment.slot.endAt,
        patientName: `${appointment.user.firstName} ${appointment.user.lastName}`,
        reason: appointment.reason || undefined,
      }));

    return {
      totalUniquePatientsAttended,
      averageRating: rating > 0 ? Number(rating.toFixed(1)) : undefined,
      upcomingAppointments,
    };
  }

  // ===========================================================================
  // DASHBOARD STATS FOR DOCTOR
  // ===========================================================================
  async getDashboardStats(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
      select: { id: true, rating: true, attendedPatients: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointmentsToday = await this.prisma.appointment.count({
      where: {
        doctorId: doctor.id,
        slot: {
          startAt: { gte: today, lt: tomorrow },
        },
        status: { notIn: ['CANCELLED'] },
      },
    });

    const pendingReports = await this.prisma.appointment.count({
      where: {
        doctorId: doctor.id,
        status: 'ATTENDED',
        medicalRecord: null,
      },
    });

    return {
      appointmentsToday,
      pendingReports,
      totalPatients: doctor.attendedPatients,
      rating: doctor.rating,
    };
  }

  // ===========================================================================
  // RECENT PATIENTS FOR DOCTOR
  // ===========================================================================
  async getRecentPatients(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get distinct patients from recent appointments
    const recentAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        status: 'ATTENDED',
        attendedAt: { gte: thirtyDaysAgo },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImage: true,
            gender: true,
          },
        },
      },
      orderBy: {
        attendedAt: 'desc',
      },
      take: 20, // Get more to ensure we have enough unique patients
    });

    // Get unique patients (deduplicate by userId)
    const uniquePatientsMap = new Map();
    for (const appointment of recentAppointments) {
      if (!uniquePatientsMap.has(appointment.user.id)) {
        uniquePatientsMap.set(appointment.user.id, appointment.user);
      }
    }

    // Return up to 5 unique patients
    return Array.from(uniquePatientsMap.values()).slice(0, 5);
  }
}
