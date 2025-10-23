import { Injectable } from '@nestjs/common';
import { Prisma, Clinic } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClinicWithRelations } from './entities/clinic.entity';

@Injectable()
export class ClinicRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ClinicCreateInput): Promise<Clinic> {
    return this.prisma.clinic.create({ data });
  }

  async findById(id: string): Promise<ClinicWithRelations | null> {
    return this.prisma.clinic.findUnique({
      where: { id },
      include: { rooms: true, doctors: true },
    });
  }

  async update(id: string, data: Prisma.ClinicUpdateInput): Promise<Clinic> {
    return this.prisma.clinic.update({ where: { id }, data });
  }

  async remove(id: string): Promise<Clinic> {
    return this.prisma.clinic.delete({ where: { id } });
  }

  async findAll(): Promise<Clinic[]> {
    return this.prisma.clinic.findMany({
      include: { rooms: true, doctors: true },
    });
  }
}
