import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, createRoomDto: CreateRoomDto) {
    try {
      const existingRoom = await this.prisma.room.findFirst({
        where: { name: createRoomDto.name, clinicId },
      });
      if (existingRoom) throw new ConflictException('Room already exists');
      return this.prisma.room.create({
        data: { ...createRoomDto, clinicId },
        include: { clinic: true },
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error creating room');
    }
  }

  async listRoomsByClinic(clinicId: string) {
    return this.prisma.room.findMany({
      where: { clinicId },
      include: { clinic: true },
    });
  }

  async getRoomById(clinicId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId, clinicId },
      include: { clinic: true },
    });
    if (!room) throw new NotFoundException(`Room with id ${roomId} not found`);
    return room;
  }

  async updateRoomByClinic(
    clinicId: string,
    roomId: string,
    updateRoomDto: UpdateRoomDto,
  ) {
    await this.getRoomById(clinicId, roomId);
    return this.prisma.room.update({
      where: { id: roomId, clinicId },
      data: updateRoomDto,
      include: { clinic: true },
    });
  }

  async removeRoom(clinicId: string, roomId: string) {
    await this.getRoomById(clinicId, roomId);
    return this.prisma.room.delete({
      where: { id: roomId, clinicId },
      include: { clinic: true },
    });
  }
}
