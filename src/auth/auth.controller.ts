import {
  Body,
  Controller,
  // Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  // ApiBearerAuth,
  // ApiCookieAuth,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser } from './types/user-without-password';
// import { JwtAuthGuard } from './guards/jwt-auth.guard';
// import { RolesGuard } from './guards/roles.guard';
// import { Role } from '@prisma/client';
// import { CurrentUser } from './decorators/user.decorator';
// import { Roles } from './decorators/roles.decorator';
// import type { CurrentUserPayload } from './types/current-user.interface';
// import { first } from 'rxjs';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 registros por minuto
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar nuevo usuario',
    description: 'Crea una nueva cuenta de usuario en el sistema',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'Usuario registrado exitosamente',
    schema: {
      example: {
        statusCode: 201,
        message: 'User registered successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 409,
    description: 'El usuario ya existe',
  })
  async register(@Body() registerDto: RegisterDto) {
    await this.authService.register(registerDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'User registered successfully',
    };
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 intentos de login por minuto
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autentica al usuario y retorna un token JWT',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Login exitoso',
    schema: {
      example: {
        statusCode: 200,
        message: 'Login successful',
        data: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 'uuid-here',
            email: 'usuario@example.com',
            firstName: 'Juan',
            lastName: 'Pérez',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales inválidas',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
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

  // @Get('profile')
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({
  //   summary: 'Obtener perfil del usuario',
  //   description: 'Retorna la información del perfil del usuario autenticado',
  // })
  // @ApiBearerAuth('bearerAuth')
  // @ApiCookieAuth('cookieAuth')
  // @ApiOkResponse({
  //   description: 'Perfil obtenido exitosamente',
  //   schema: {
  //     example: {
  //       statusCode: 200,
  //       message: 'Perfil obtenido correctamente',
  //       data: {
  //         userId: 'uuid-here',
  //         dni: '12345678',
  //         email: 'usuario@example.com',
  //         firstName: 'Juan',
  //         lastName: 'Pérez',
  //         role: 'PATIENT',
  //       },
  //     },
  //   },
  // })
  // @ApiUnauthorizedResponse({
  //   description: 'Token JWT inválido o expirado',
  // })
  // async getProfile(@Request() req) {
  //   return {
  //     statusCode: HttpStatus.OK,
  //     message: 'Perfil obtenido correctamente',
  //     data: req.user,
  //   };
  // }

  //   @Get('admin/dashboard')
  //   @UseGuards(JwtAuthGuard, RolesGuard)
  //   @Roles(Role.ADMIN)
  //   @ApiOperation({
  //     summary: 'Dashboard de administrador',
  //     description:
  //       'Obtiene el dashboard con funcionalidades específicas para administradores',
  //   })
  //   @ApiBearerAuth('bearerAuth')
  //   @ApiCookieAuth('cookieAuth')
  //   @ApiOkResponse({
  //     description: 'Dashboard admin obtenido exitosamente',
  //     schema: {
  //       example: {
  //         statusCode: 200,
  //         message: 'Dashboard admin',
  //         data: {
  //           user: {
  //             id: 'uuid-here',
  //             dni: '12345678',
  //             role: 'ADMIN',
  //           },
  //           adminFeatures: [
  //             'Gestión de usuarios',
  //             'Gestión de citas',
  //             'Gestión de doctores',
  //             'Reportes y estadísticas',
  //           ],
  //         },
  //       },
  //     },
  //   })
  //   @ApiUnauthorizedResponse({
  //     description: 'Token JWT inválido o expirado',
  //   })
  //   @ApiResponse({
  //     status: 403,
  //     description: 'Acceso denegado - Se requiere rol de ADMIN',
  //   })
  //   async getAdminDashboard(@CurrentUser() user: CurrentUserPayload) {
  //     return {
  //       statusCode: HttpStatus.OK,
  //       message: 'Dashboard admin',
  //       data: {
  //         user: {
  //           id: user.userId,
  //           dni: user.dni,
  //           role: user.role,
  //         },
  //         adminFeatures: [
  //           'Gestión de usuarios',
  //           'Gestión de citas',
  //           'Gestión de doctores',
  //           'Reportes y estadísticas',
  //         ],
  //       },
  //     };
  //   }

  //   /**
  //    * 🔹 DASHBOARD PACIENTE - GET /auth/patient/dashboard
  //    * Solo accesible para usuarios con rol PATIENT
  //    */
  // @Get('patient/dashboard')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.PATIENT)
  // @ApiOperation({
  //   summary: 'Dashboard de paciente',
  //   description:
  //     'Obtiene el dashboard con funcionalidades específicas para pacientes',
  // })
  // @ApiBearerAuth('bearerAuth')
  // @ApiCookieAuth('cookieAuth')
  // @ApiOkResponse({
  //   description: 'Dashboard patient obtenido exitosamente',
  //   schema: {
  //     example: {
  //       statusCode: 200,
  //       message: 'Dashboard patient',
  //       data: {
  //         user: {
  //           id: 'uuid-here',
  //           dni: '12345678',
  //           role: 'PATIENT',
  //         },
  //         patientFeatures: [
  //           'Mis citas',
  //           'Reservar cita',
  //           'Historial médico',
  //           'Perfil personal',
  //         ],
  //       },
  //     },
  //   },
  // })
  // @ApiUnauthorizedResponse({
  //   description: 'Token JWT inválido o expirado',
  // })
  // @ApiResponse({
  //   status: 403,
  //   description: 'Acceso denegado - Se requiere rol de PATIENT',
  // })
  // async getPatientDashboard(@CurrentUser() user: CurrentUserPayload) {
  //   return {
  //     statusCode: HttpStatus.OK,
  //     message: 'Dashboard patient',
  //     data: {
  //       user: {
  //         id: user.userId,
  //         dni: user.dni,
  //         role: user.role,
  //       },
  //       patientFeatures: [
  //         'Mis citas',
  //         'Reservar cita',
  //         'Historial médico',
  //         'Perfil personal',
  //       ],
  //     },
  //   };
  // }
}
