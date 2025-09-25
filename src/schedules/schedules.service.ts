import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createScheduleDto: CreateScheduleDto) {
    try {
      const scheduleAlreadyExists = await this.prisma.schedule.findFirst({
        where: {
          doctorId: createScheduleDto.doctorId,
          dayOfWeek: createScheduleDto.dayOfWeek,
          startTime: createScheduleDto.startTime,
          endTime: createScheduleDto.endTime,
        },
      });
      if (scheduleAlreadyExists) {
        throw new ConflictException('Schedule already exists');
      }
      const schedule = await this.prisma.schedule.create({
        data: createScheduleDto,
      });
      return schedule;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error creating schedule');
    }
  }

  findAll() {
    return this.prisma.schedule.findMany();
  }

  findOne(id: number) {
    return `This action returns a #${id} schedule`;
  }

  update(id: number, updateScheduleDto: UpdateScheduleDto) {
    return `This action updates a #${id} schedule`;
  }

  remove(id: number) {
    return `This action removes a #${id} schedule`;
  }
}
