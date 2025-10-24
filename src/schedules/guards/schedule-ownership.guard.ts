import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import type { CurrentUserPayload } from 'src/auth/types/current-user.interface';

/**
 * Guard que verifica que un doctor solo pueda modificar sus propios horarios
 * Los administradores tienen acceso completo
 */
@Injectable()
export class ScheduleOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: CurrentUserPayload = request.user;

    // Si no hay usuario autenticado, denegar acceso
    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Los administradores tienen acceso completo
    if (user.role === Role.ADMIN) {
      return true;
    }

    // Solo los doctores pueden continuar
    if (user.role !== Role.DOCTOR) {
      throw new ForbiddenException(
        'Solo doctores y administradores pueden gestionar horarios',
      );
    }

    // Obtener el scheduleId de los parámetros de la ruta
    const scheduleId = request.params.id || request.params.scheduleId;

    if (!scheduleId) {
      throw new ForbiddenException(
        'No se proporcionó el ID del horario a verificar',
      );
    }

    // Buscar el schedule y verificar que pertenece al doctor
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      select: {
        id: true,
        doctorId: true,
        doctor: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Horario no encontrado');
    }

    // Verificar que el schedule pertenece al doctor autenticado
    if (schedule.doctor.userId !== user.userId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar este horario',
      );
    }

    return true;
  }
}
