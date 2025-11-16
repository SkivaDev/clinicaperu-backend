import {
  Body,
  Controller,
  // Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Response,
  UseGuards,
  UnauthorizedException,
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
import type { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import { RefreshTokenService } from './refresh-token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

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
    @Request() req: { user: AuthenticatedUser } & ExpressRequest,
    @Body() loginDto: LoginDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    // El LocalAuthGuard ya validó las credenciales
    const accessToken = await this.authService.login(req.user);

    // ✅ SEGURIDAD: Generar refresh token (7 días)
    const refreshToken = await this.refreshTokenService.generateRefreshToken(
      req.user.id,
      req.ip,
      req.headers['user-agent'],
    );

    // ✅ Access token: cookie HttpOnly corta (15 min)
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutos
      path: '/',
    });

    // ✅ Refresh token: cookie HttpOnly larga (7 días)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/',
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      data: {
        access_token: accessToken,
        user: {
          id: req.user.id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
        },
      },
    };
  }

  /**
   * ✅ SEGURIDAD: Endpoint para refrescar access token
   * Usa el refresh token (7 días) para generar un nuevo access token (15 min)
   */
  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refrescar access token',
    description:
      'Genera un nuevo access token usando el refresh token de la cookie',
  })
  @ApiOkResponse({
    description: 'Access token renovado exitosamente',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token inválido o expirado',
  })
  async refreshToken(
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // Validar refresh token y obtener userId
    const userId =
      await this.refreshTokenService.validateRefreshToken(refreshToken);

    // Obtener información del usuario para el nuevo access token
    const user = await this.authService.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generar nuevo access token
    const newAccessToken = this.refreshTokenService.generateAccessToken(
      user.id,
      user.dni,
      user.role,
    );

    // Enviar nuevo access token en cookie
    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutos
      path: '/',
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Access token refreshed successfully',
      data: {
        access_token: newAccessToken,
      },
    };
  }

  /**
   * ✅ SEGURIDAD: Logout que revoca el refresh token
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar sesión',
    description:
      'Revoca el refresh token y limpia las cookies de autenticación',
  })
  @ApiOkResponse({
    description: 'Sesión cerrada exitosamente',
  })
  async logout(
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const refreshToken = req.cookies['refreshToken'];

    if (refreshToken) {
      // Revocar el refresh token en la base de datos
      await this.refreshTokenService.revokeRefreshToken(refreshToken);
    }

    // Limpiar cookies
    res.clearCookie('token', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    return {
      statusCode: HttpStatus.OK,
      message: 'Logged out successfully',
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
