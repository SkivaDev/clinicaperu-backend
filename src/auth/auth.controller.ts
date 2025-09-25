import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser } from './types/user-without-password';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from './decorators/user.decorator';
import { Roles } from './decorators/roles.decorator';
import type { CurrentUserPayload } from './types/current-user.interface';
import { first } from 'rxjs';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    await this.authService.register(registerDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'User registered successfully',
    };
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Request() req: { user: AuthenticatedUser },
    @Body() loginDto: LoginDto,
  ) {
    // El LocalAuthGuard ya validó las credenciales
    // req.user contiene la información del usuario validado
    const token = await this.authService.login(req.user);

    return {
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      data: {
        access_token: token,
        user: {
          id: req.user.id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
      },
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return {
      statusCode: HttpStatus.OK,
      message: 'Perfil obtenido correctamente',
      data: req.user,
    };
  }

  @Get('admin/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAdminDashboard(@CurrentUser() user: CurrentUserPayload) {
    return {
      statusCode: HttpStatus.OK,
      message: 'Dashboard admin',
      data: {
        user: {
          id: user.userId,
          dni: user.dni,
          role: user.role,
        },
        adminFeatures: [
          'Gestión de usuarios',
          'Gestión de citas',
          'Gestión de doctores',
          'Reportes y estadísticas',
        ],
      },
    };
  }

  /**
   * 🔹 DASHBOARD PACIENTE - GET /auth/patient/dashboard
   * Solo accesible para usuarios con rol PATIENT
   */
  @Get('patient/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  async getPatientDashboard(@CurrentUser() user: CurrentUserPayload) {
    return {
      statusCode: HttpStatus.OK,
      message: 'Dashboard patient',
      data: {
        user: {
          id: user.userId,
          dni: user.dni,
          role: user.role,
        },
        patientFeatures: [
          'Mis citas',
          'Reservar cita',
          'Historial médico',
          'Perfil personal',
        ],
      },
    };
  }
}
