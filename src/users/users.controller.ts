import {
  Controller,
  Get,
  Put,
  HttpStatus,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { UserSearchResultDto } from './dto/user-search-result.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  PatientProfileDto,
  DoctorProfileDto,
} from './dto/profile-response.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import type { CurrentUserPayload } from 'src/auth/types/current-user.interface';
import { Role } from '@prisma/client';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/search - Buscar usuarios
   * Permite buscar usuarios por DNI, nombre, apellido o email
   * Solo accesible para DOCTOR y ADMIN
   */
  @Get('search')
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Buscar usuarios',
    description:
      'Busca usuarios por DNI, nombre, apellido o email. Puede filtrar por rol (PATIENT, DOCTOR, ADMIN). Solo retorna usuarios activos.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Término de búsqueda (DNI, nombre, apellido o email)',
    example: 'Juan',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: Role,
    description: 'Filtrar por rol específico',
    example: Role.PATIENT,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Límite de resultados (default: 20, max: 50)',
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usuarios encontrados exitosamente',
    type: [UserSearchResultDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Parámetro de búsqueda requerido',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autenticado',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'No tiene permisos (requiere rol DOCTOR o ADMIN)',
  })
  async searchUsers(
    @Query('q') query: string,
    @Query('role') role?: Role,
    @Query('limit') limit?: number,
  ): Promise<ResponseDto<UserSearchResultDto[]>> {
    // Validar que el query no esté vacío
    if (!query || query.trim().length === 0) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Search query is required',
        data: [],
      };
    }

    // Limitar el número máximo de resultados
    const maxLimit = Math.min(limit || 20, 50);

    const users = await this.usersService.searchUsers(
      query.trim(),
      role,
      maxLimit,
    );

    return {
      statusCode: HttpStatus.OK,
      message: `Found ${users.length} user(s)`,
      data: users,
    };
  }

  // @Post()
  // create(@Body() createUserDto: CreateUserDto) {
  //return this.usersService.create(createUserDto);
  // }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar todos los usuarios',
    description:
      'Obtiene la lista completa de usuarios. Solo para administradores.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de usuarios obtenida exitosamente',
    type: [UserResponseDto],
  })
  async findAll(): Promise<ResponseDto<UserResponseDto[]>> {
    const users = await this.usersService.findAll();

    return {
      statusCode: HttpStatus.OK,
      message: 'Users retrieved successfully',
      data: users,
    };
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.usersService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
  //   return this.usersService.update(+id, updateUserDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.usersService.remove(+id);
  // }

  /**
   * HU-028: GET /users/profile
   * Obtiene el perfil del usuario autenticado
   * Genera URL prefirmada para la imagen de perfil
   */
  @Get('profile')
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener perfil del usuario autenticado',
    description:
      'Retorna el perfil del usuario autenticado con URL prefirmada para la imagen de perfil (válida por 5 minutos). Doctores reciben información adicional profesional.',
  })
  @ApiOkResponse({
    description: 'Perfil obtenido exitosamente',
    type: PatientProfileDto,
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
  })
  async getProfile(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<PatientProfileDto | DoctorProfileDto>> {
    const profile = await this.usersService.getProfile(user.userId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Profile retrieved successfully',
      data: profile,
    };
  }

  /**
   * HU-028: PUT /users/profile
   * Actualiza el perfil del usuario autenticado
   * Valida campos readonly y unicidad de email
   */
  @Put('profile')
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 actualizaciones por minuto
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Actualizar perfil del usuario',
    description:
      'Actualiza los datos del perfil del usuario autenticado. Los campos DNI y fecha de nacimiento son readonly para pacientes. CMP, especialidad y clínica son readonly para doctores.',
  })
  @ApiOkResponse({
    description: 'Perfil actualizado exitosamente',
    type: PatientProfileDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos',
  })
  @ApiConflictResponse({
    description: 'El email ya está en uso',
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
  })
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<ResponseDto<PatientProfileDto | DoctorProfileDto>> {
    const profile = await this.usersService.updateProfile(user.userId, dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: profile,
    };
  }

  /**
   * HU-028: PUT /users/password
   * Cambia la contraseña del usuario autenticado
   * Valida contraseña actual y requisitos de seguridad
   */
  @Put('password')
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 cambios por minuto
  @Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Cambiar contraseña',
    description:
      'Cambia la contraseña del usuario autenticado. Requiere contraseña actual y validación de nueva contraseña (min 8 chars, 1 mayúscula, 1 minúscula, 1 número).',
  })
  @ApiOkResponse({
    description: 'Contraseña actualizada exitosamente',
    schema: {
      example: {
        statusCode: 200,
        message: 'Password updated successfully',
        data: { message: 'Password updated successfully' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Contraseña actual incorrecta o validación fallida',
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
  })
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<ResponseDto<{ message: string }>> {
    const result = await this.usersService.changePassword(user.userId, dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'Password updated successfully',
      data: result,
    };
  }
}
