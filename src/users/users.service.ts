import { Injectable } from '@nestjs/common';
// import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma.service';
import { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { HashingService } from 'src/common/hashing/hashing.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService,
  ) {}

  // create(data: Prisma.UserCreateInput): Promise<User> {
  //   return this.prisma.user.create({ data });
  // }

  async create(dto: CreateUserDto) {
    const { password, ...userData } = dto;
    return this.prisma.user.create({
      data: {
        ...userData,
        passwordHash: await this.hashingService.hash(password),
      },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByDni(dni: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { dni } });
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // findOne(id: number) {
  //   return `This action returns a #${id} user`;
  // }

  // update(id: number, updateUserDto: UpdateUserDto) {
  //   return `This action updates a #${id} user`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} user`;
  // }
}
