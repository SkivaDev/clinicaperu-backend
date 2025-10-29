import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { UserSearchResultDto } from './dto/user-search-result.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
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
}
