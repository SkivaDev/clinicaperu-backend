import { Injectable } from '@nestjs/common';
// import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, Role } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { HashingService } from 'src/common/hashing/hashing.service';
import { UserSearchResultDto } from './dto/user-search-result.dto';

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
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash: await this.hashingService.hash(password),
      },
    });

    // Excluir passwordHash
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByDni(dni: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { dni } });
  }

  async findAll() {
    const users = await this.prisma.user.findMany();

    // Excluir passwordHash de cada usuario
    return users.map((user) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;

    // Excluir passwordHash
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Busca usuarios por DNI, nombre, apellido o email
   * @param query - Término de búsqueda
   * @param role - Filtro opcional por rol (PATIENT, DOCTOR, ADMIN)
   * @param limit - Límite de resultados (default: 20)
   * @returns Lista de usuarios que coinciden con la búsqueda
   */
  async searchUsers(
    query: string,
    role?: Role,
    limit: number = 20,
  ): Promise<UserSearchResultDto[]> {
    // Construir cláusula WHERE con búsqueda en múltiples campos
    const whereConditions: any[] = [
      {
        OR: [
          { dni: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      { isActive: true },
    ];

    // Agregar filtro por rol si se especifica
    if (role) {
      whereConditions.push({ role });
    }

    const users = await this.prisma.user.findMany({
      where: {
        AND: whereConditions,
      },
      select: {
        id: true,
        dni: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        profileImage: true,
        role: true,
        isActive: true,
      },
      take: limit,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Mapear para convertir null a undefined
    return users.map((user) => ({
      ...user,
      phone: user.phone ?? undefined,
      profileImage: user.profileImage ?? undefined,
    }));
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
