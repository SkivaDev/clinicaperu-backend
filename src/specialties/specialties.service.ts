import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';

@Injectable()
export class SpecialtiesService {
  constructor(private readonly prisma: PrismaService) {}

  async createSpecialty(dto: CreateSpecialtyDto) {
    try {
      const existingSpecialty = await this.prisma.specialty.findFirst({
        where: { name: dto.name },
      });
      if (existingSpecialty) {
        throw new ConflictException('Specialty already registered');
      }
      return this.prisma.specialty.create({ data: dto });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error creating specialty');
    }
  }

  async listSpecialties() {
    return this.prisma.specialty.findMany({
      include: { doctors: true },
    });
  }

  async getSpecialtyById(id: string) {
    const specialty = await this.prisma.specialty.findUnique({
      where: { id },
      include: { doctors: true },
    });
    if (!specialty)
      throw new NotFoundException(`Specialty with id ${id} not found.`);
    return specialty;
  }

  async updateSpecialty(id: string, updateSpecialtyDto: UpdateSpecialtyDto) {
    const updatedSpecialty = await this.prisma.specialty.update({
      where: { id },
      data: updateSpecialtyDto,
    });
    if (!updatedSpecialty) {
      throw new NotFoundException(`Specialty with id ${id} not found.`);
    }
    return updatedSpecialty;
  }

  async removeSpecialty(id: string) {
    const deletedSpecialty = await this.prisma.specialty.delete({
      where: { id },
    });
    if (!deletedSpecialty) {
      throw new NotFoundException(`Specialty with id ${id} not found.`);
    }
    return deletedSpecialty;
  }
}
