import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ClinicsService {
  constructor(private readonly prisma: PrismaService) {}

  async createClinic(dto: CreateClinicDto) {
    try {
      const existingClinic = await this.prisma.clinic.findFirst({
        where: { OR: [{ name: dto.name }, { address: dto.address }] },
      });
      if (existingClinic) {
        throw new ConflictException('Name or Address already registered');
      }
      return this.prisma.clinic.create({
        data: dto,
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error creating clinic');
    }
  }

  async getClinicById(id: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: { rooms: true, doctors: true },
    });
    if (!clinic) throw new NotFoundException('Clinic not found');
    return clinic;
  }

  async updateClinic(id: string, dto: UpdateClinicDto) {
    await this.getClinicById(id);
    return this.prisma.clinic.update({ where: { id }, data: dto });
  }

  async deleteClinic(id: string) {
    await this.getClinicById(id);
    return this.prisma.clinic.delete({ where: { id } });
  }

  async listClinics() {
    return this.prisma.clinic.findMany({
      include: { rooms: true, doctors: true },
    });
  }

  // async listDoctorsInClinic(clinicId: string) {
  //   const clinic = await this.getClinic(clinicId);
  //   return clinic.doctors;
  // }

  // async listRoomsInClinic(clinicId: string) {
  //   const clinic = await this.getClinic(clinicId);
  //   return clinic.rooms;
  // }
}
