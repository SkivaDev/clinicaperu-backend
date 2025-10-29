import { Controller, Get, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';
// import { CreateAdminDto } from './dto/create-admin.dto';
// import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UsersService } from 'src/users/users.service';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import type { CurrentUserPayload } from 'src/auth/types/current-user.interface';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * 🔹 GESTIÓN DE USUARIOS - GET /admin/users
   * Solo para administradores
   */
  @Get('users')
  async getAllUsers(@CurrentUser() adminUser: CurrentUserPayload) {
    const users = await this.usersService.findAll();

    return {
      statusCode: HttpStatus.OK,
      message: 'Lista de usuarios obtenida correctamente',
      data: {
        users,
        total: users.length,
        adminInfo: {
          adminId: adminUser.userId,
          dni: adminUser.dni,
          role: adminUser.role,
        },
      },
    };
  }

  /**
   * 🔹 VER USUARIO ESPECÍFICO - GET /admin/users/:id
   */
  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);

    if (!user) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'User not found',
      };
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'User found successfully',
      data: user,
    };
  }

  // @Post()
  // create(@Body() createAdminDto: CreateAdminDto) {
  //   return this.adminService.create(createAdminDto);
  // }

  // @Get()
  // findAll() {
  //   return this.adminService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.adminService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
  //   return this.adminService.update(+id, updateAdminDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.adminService.remove(+id);
  // }
}
