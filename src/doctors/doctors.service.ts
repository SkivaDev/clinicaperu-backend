import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HashingService } from 'src/common/hashing/hashing.service';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import {
  PublicDoctorListDto,
  PublicDoctorDetailDto,
} from './dto/public-doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService,
  ) {}

  async createDoctor(dto: CreateUserDto & CreateDoctorDto) {
    try {
      // 1. Validar duplicados básicos (dni, email, cmp)
      const existingUser = await this.prisma.user.findFirst({
        where: { OR: [{ dni: dto.dni }, { email: dto.email }] },
      });
      if (existingUser) {
        throw new ConflictException('Email o DNI ya están registrados');
      }

      const existingCmp = await this.prisma.doctor.findUnique({
        where: { cmp: dto.cmp },
      });
      if (existingCmp) {
        throw new ConflictException('CMP ya está registrado');
      }

      // 2. Hashear password
      const hashedPassword = await this.hashingService.hash(dto.password);

      // 3. Crear User + Doctor en una transacción
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            dni: dto.dni,
            email: dto.email,
            passwordHash: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            dayOfBirth: new Date(dto.dayOfBirth),
            phone: dto.phone,
            gender: dto.gender,
            role: 'DOCTOR',
          },
        });

        const doctor = await tx.doctor.create({
          data: {
            cmp: dto.cmp,
            isActive: dto.isActive,
            yearsOfExperience: dto.yearsOfExperience,
            consultationPrice: dto.consultationPrice,
            clinic: { connect: { id: dto.clinicId } },
            specialty: { connect: { id: dto.specialtyId } },
            user: { connect: { id: user.id } },
          },
        });

        //retornar sin el passwordHash
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash: _, ...userWithoutPassword } = user;
        return { ...doctor, user: userWithoutPassword };
      });

      return result;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error al registrar al doctor');
    }
  }

  async getDoctorDetail(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: { user: true, clinic: true, specialty: true, schedules: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    // Excluir passwordHash del usuario
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = doctor.user;
    return { ...doctor, user: userWithoutPassword };
  }

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

  async updateDoctor(id: string, dto: UpdateUserDto & UpdateDoctorDto) {
    // Verificar existencia
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor no encontrado');
    }

    // Si hay password, hashearlo
    let passwordHash: string | undefined;
    if (dto.password) {
      passwordHash = await this.hashingService.hash(dto.password);
    }

    // Actualizar en transacción
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: doctor.userId },
        data: {
          dni: dto.dni,
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          gender: dto.gender,
          dayOfBirth: dto.dayOfBirth ? new Date(dto.dayOfBirth) : undefined,
          ...(passwordHash && { passwordHash }),
        },
      });

      const updatedDoctor = await tx.doctor.update({
        where: { id },
        data: {
          cmp: dto.cmp,
          isActive: dto.isActive,
          yearsOfExperience: dto.yearsOfExperience,
          consultationPrice: dto.consultationPrice,
          clinic: dto.clinicId ? { connect: { id: dto.clinicId } } : undefined,
          specialty: dto.specialtyId
            ? { connect: { id: dto.specialtyId } }
            : undefined,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      return { ...updatedDoctor, user: userWithoutPassword };
    });

    return result;
  }

  async deleteDoctor(id: string) {
    await this.getDoctorIds(id);
    const doctor = await this.prisma.doctor.delete({
      where: { id },
      include: { user: true },
    });

    // Excluir passwordHash del usuario
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = doctor.user;
    return { ...doctor, user: userWithoutPassword };
  }

  async listDoctors() {
    const doctors = await this.prisma.doctor.findMany({
      include: { user: true, clinic: true, specialty: true },
    });

    // Excluir passwordHash de cada usuario
    return doctors.map((doctor) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...userWithoutPassword } = doctor.user;
      return { ...doctor, user: userWithoutPassword };
    });
  }

  async listDoctorsByClinic(clinicId: string) {
    const doctors = await this.prisma.doctor.findMany({
      where: { clinicId },
      include: { user: true, specialty: true },
    });

    // Excluir passwordHash de cada usuario
    return doctors.map((doctor) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...userWithoutPassword } = doctor.user;
      return { ...doctor, user: userWithoutPassword };
    });
  }

  async listDoctorsBySpecialty(specialtyId: string) {
    const doctors = await this.prisma.doctor.findMany({
      where: { specialtyId },
      include: { user: true, clinic: true },
    });

    // Excluir passwordHash de cada usuario
    return doctors.map((doctor) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...userWithoutPassword } = doctor.user;
      return { ...doctor, user: userWithoutPassword };
    });
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

    const data: PublicDoctorListDto[] = doctors.map((doctor) => ({
      id: doctor.id,
      cmp: doctor.cmp,
      yearsOfExperience: doctor.yearsOfExperience || null,
      consultationPrice: doctor.consultationPrice || null,
      attendedPatients: doctor.attendedPatients,
      rating: doctor.rating > 0 ? doctor.rating : undefined,
      // attendedAppointments: doctor.attendedAppointments,
      // totalAppointments: doctor.appointments.length,
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
      // totalAppointments: doctor.appointments.length,
    }));

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
      // totalAppointments: doctor.appointments.length,
      schedules: doctor.schedules.map((schedule) => ({
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      })),
    };
  }
}
