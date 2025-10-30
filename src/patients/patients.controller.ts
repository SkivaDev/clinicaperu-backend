import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import type { CurrentUserPayload } from 'src/auth/types/current-user.interface';
import { Role } from '@prisma/client';
import { ResponseDto } from 'src/common/dto/response.dto';
import { MyDoctorDto } from './dto/my-doctor.dto';

@ApiTags('patients')
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /**
   * HU-027: GET /patients/my-doctors
   * Retorna la lista de doctores que han atendido al paciente autenticado
   * Solo accesible para pacientes
   */
  @Get('my-doctors')
  @Roles(Role.PATIENT)
  @ApiOperation({
    summary: 'Obtener mis doctores',
    description:
      'Retorna la lista de doctores que han atendido al paciente autenticado, ordenados por fecha de última cita (más reciente primero). Solo incluye doctores activos con citas confirmadas o atendidas.',
  })
  @ApiOkResponse({
    description: 'Lista de doctores obtenida exitosamente',
    type: ResponseDto<MyDoctorDto[]>,
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
  })
  @ApiForbiddenResponse({
    description: 'No tiene permisos (requiere rol PATIENT)',
  })
  async getMyDoctors(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<MyDoctorDto[]>> {
    const doctors = await this.patientsService.getMyDoctors(user.userId);

    return {
      statusCode: HttpStatus.OK,
      message: `Found ${doctors.length} doctor(s)`,
      data: doctors,
    };
  }
}
