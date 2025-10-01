import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { PrismaService } from 'src/prisma.service';
import { HashingService } from 'src/common/hashing/hashing.service';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';

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
    return doctor;
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

      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      return { ...updatedDoctor, user: userWithoutPassword };
    });

    return result;
  }

  async deleteDoctor(id: string) {
    await this.getDoctorIds(id);
    return this.prisma.doctor.delete({
      where: { id },
      include: { user: true },
    });
  }

  async listDoctors() {
    return this.prisma.doctor.findMany({
      include: { user: true, clinic: true, specialty: true },
    });
  }

  async listDoctorsByClinic(clinicId: string) {
    return this.prisma.doctor.findMany({
      where: { clinicId },
      include: { user: true, specialty: true },
    });
  }

  async listDoctorsBySpecialty(specialtyId: string) {
    return this.prisma.doctor.findMany({
      where: { specialtyId },
      include: { user: true, clinic: true },
    });
  }
}
