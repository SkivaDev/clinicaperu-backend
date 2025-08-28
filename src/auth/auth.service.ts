import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from 'src/auth/dto/register.dto';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser } from './types/user-without-password';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<void> {
    const { dni, email, password, ...userData } = registerDto;

    try {
      const existingEmail = await this.usersService.findByEmail(email);
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }

      const existingDni = await this.usersService.findByDni(dni);
      if (existingDni) {
        throw new ConflictException('DNI already exists');
      }

      const saltRounds = 10;
      const hashedPassword = (await bcrypt.hash(
        password,
        saltRounds,
      )) as string;

      await this.usersService.create({
        dni,
        email,
        role: 'PATIENT',
        passwordHash: hashedPassword,
        ...userData,
      });
    } catch (error) {
      // Propagar errores de validación específicos
      if (error instanceof ConflictException) {
        throw error;
      }

      // Error genérico para otros casos
      console.log(error);
      throw new InternalServerErrorException('Error registering user');
    }
  }

  // async login(loginDto: LoginDto) {
  //   try {
  //     const user = await this.usersService.findByDni(loginDto.dni);
  //     if (!user) {
  //       throw new UnauthorizedException('User not found');
  //     }
  //     const isPasswordValid = await bcrypt.compare(
  //       loginDto.password,
  //       user.passwordHash,
  //     );

  //     if (!isPasswordValid) {
  //       throw new UnauthorizedException('Invalid password');
  //     }
  //     return this.generateToken(user);
  //   } catch (error) {
  //     console.log(error);
  //     throw new InternalServerErrorException('Error logging in user');
  //   }
  // }

  /**
   * 🔹 LOGIN - Genera JWT token después de validación exitosa
   * LocalStrategy ya validó las credenciales
   */
  async login(user: AuthenticatedUser): Promise<string> {
    try {
      const payload = {
        sub: user.id,
        email: user.email,
        dni: user.dni,
        names: user.names,
        fatherSurname: user.fatherSurname,
        motherSurname: user.motherSurname,
      };

      // Generar JWT token
      return this.jwtService.signAsync(payload);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Error generating token');
    }
  }

  /**
   * 🔹 VALIDACIÓN - Usado por LocalStrategy para validar credenciales
   * Compara dni + password con la base de datos
   */
  async validateUser(dni: string, password: string): Promise<any> {
    try {
      // 1. Buscar usuario por dni
      const user = await this.usersService.findByDni(dni);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // 2. Comparar contraseñas
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // 3. Retornar usuario sin la contraseña
      const { passwordHash, ...result } = user;
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Error validating credentials');
    }
  }
}
