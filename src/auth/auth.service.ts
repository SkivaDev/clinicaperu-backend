import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { RegisterDto } from 'src/dto/register.dto';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

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
}
