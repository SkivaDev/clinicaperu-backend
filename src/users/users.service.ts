import { Injectable, BadRequestException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, Role } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { HashingService } from 'src/common/hashing/hashing.service';
import { UserSearchResultDto } from './dto/user-search-result.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PatientProfileDto, DoctorProfileDto } from './dto/profile-response.dto';
import { S3Service } from 'src/common/s3/s3.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService,
    private readonly s3Service: S3Service,
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

    // Mapear para convertir null a undefined y generar URLs de S3
    return Promise.all(
      users.map(async (user) => {
        let profileImageUrl: string | undefined = undefined;
        if (user.profileImage) {
          try {
            const url = await this.s3Service.generateDownloadUrl(
              user.profileImage,
              3600,
            );
            profileImageUrl = url ?? undefined;
          } catch {
            // Si falla, dejar como undefined
          }
        }
        return {
          ...user,
          phone: user.phone ?? undefined,
          profileImage: profileImageUrl,
        };
      }),
    );
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

  /**
   * HU-028: Obtiene el perfil del usuario autenticado
   * Genera URL prefirmada para la imagen de perfil si existe
   */
  async getProfile(
    userId: string,
  ): Promise<PatientProfileDto | DoctorProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        doctor: {
          include: {
            specialty: true,
            clinic: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generar URL prefirmada para la imagen de perfil si existe
    let profileImageUrl: string | null = null;
    if (user.profileImage) {
      try {
        profileImageUrl = await this.s3Service.generateDownloadUrl(
          user.profileImage,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to generate profile image URL for user ${userId}: ${error.message}`,
        );
        // No lanzar error, solo continuar sin imagen
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, profileImage, ...userWithoutPassword } = user;

    // Si es doctor, retornar con información adicional
    if (user.role === Role.DOCTOR && user.doctor) {
      const doctorProfile: DoctorProfileDto = {
        ...userWithoutPassword,
        profileImage: profileImageUrl,
        doctorInfo: {
          id: user.doctor.id,
          cmp: user.doctor.cmp,
          specialty: user.doctor.specialty.name,
          clinic: user.doctor.clinic.name,
          yearsOfExperience: user.doctor.yearsOfExperience,
          consultationPrice: user.doctor.consultationPrice,
          rating: user.doctor.rating,
        },
      };
      return doctorProfile;
    }

    // Si es paciente, retornar perfil básico
    const patientProfile: PatientProfileDto = {
      ...userWithoutPassword,
      profileImage: profileImageUrl,
    };

    return patientProfile;
  }

  /**
   * HU-028: Actualiza el perfil del usuario
   * Valida campos readonly y unicidad de email
   * Si se proporciona profileImage (key de S3), elimina la imagen anterior
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<PatientProfileDto | DoctorProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { doctor: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validar que email sea único si se está cambiando
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.findByEmail(dto.email);
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // Si se está actualizando la imagen de perfil, eliminar la anterior
    if (
      dto.profileImageKey &&
      user.profileImage &&
      dto.profileImageKey !== user.profileImage
    ) {
      try {
        await this.s3Service.deleteFile(user.profileImage);
        this.logger.log(`Deleted old profile image: ${user.profileImage}`);
      } catch (error) {
        this.logger.warn(
          `Failed to delete old profile image: ${(error as Error).message}`,
        );
        // No bloquear la actualización si falla el borrado
      }
    }

    // Actualizar usuario
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        profileImage: dto.profileImageKey,
      },
    });

    this.logger.log(`Profile updated for user ${userId}`);

    // Retornar perfil actualizado con URL prefirmada
    return this.getProfile(userId);
  }

  /**
   * HU-028: Cambia la contraseña del usuario
   * Valida contraseña actual y requisitos de seguridad
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    // Validar que newPassword y confirmPassword coincidan
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    // Validar que newPassword sea diferente de currentPassword
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Obtener usuario con passwordHash
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validar contraseña actual
    const isPasswordValid = await this.hashingService.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash de la nueva contraseña
    const newPasswordHash = await this.hashingService.hash(dto.newPassword);

    // Actualizar contraseña
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    this.logger.log(`Password changed for user ${userId}`);

    return { message: 'Password updated successfully' };
  }
}
