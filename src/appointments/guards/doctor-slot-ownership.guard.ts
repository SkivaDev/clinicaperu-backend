// src/appointments/guards/doctor-slot-ownership.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DoctorSlotOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body;

    // Validar que el usuario sea un doctor
    if (!user || user.role !== 'DOCTOR') {
      throw new ForbiddenException(
        'Only doctors can book appointments for patients',
      );
    }

    // Validar que se proporcione slotId
    if (!body.slotId) {
      throw new BadRequestException('slotId is required');
    }

    // Obtener el slot y verificar que pertenece al doctor
    const slot = await this.prisma.slot.findUnique({
      where: { id: body.slotId },
      include: {
        schedule: {
          select: {
            doctorId: true,
          },
        },
      },
    });

    if (!slot) {
      throw new BadRequestException('Slot not found');
    }

    // Verificar que el slot pertenece al doctor autenticado
    if (slot.schedule.doctorId !== user.doctorId) {
      throw new ForbiddenException(
        'You can only book appointments for your own slots',
      );
    }

    return true;
  }
}
