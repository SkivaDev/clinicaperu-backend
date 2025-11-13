// Validaciones pre-eliminación
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SpecialtyDeactivateGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const specialtyId = request.params.id;
    const body = request.body;

    // Solo validar si se está intentando desactivar (isActive: false)
    if (body.isActive === false) {
      const validationResult = await this.validateDeactivation(specialtyId);

      if (!validationResult.canDeactivate) {
        throw new ForbiddenException({
          message: 'No se puede desactivar la especialidad',
          reasons: validationResult.reasons,
          warnings: validationResult.warnings,
          metadata: validationResult.metadata,
        });
      }
    }

    return true;
  }

  private async validateDeactivation(specialtyId: string): Promise<{
    canDeactivate: boolean;
    reasons: string[];
    warnings: string[];
    metadata: {
      totalDoctors: number;
      activeDoctors: number;
      upcomingAppointments: number;
    };
  }> {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // 1️⃣ Verificar doctores activos
    const activeDoctors = await this.prisma.doctor.count({
      where: {
        specialtyId,
        user: {
          isActive: true,
        },
      },
    });

    const totalDoctors = await this.prisma.doctor.count({
      where: { specialtyId },
    });

    if (activeDoctors > 0) {
      reasons.push(
        `Tiene ${activeDoctors} doctor(es) activo(s) asociado(s). Debe desactivar o reasignar los doctores primero.`,
      );
    }

    // 2️⃣ Verificar citas futuras programadas
    const upcomingAppointments = await this.prisma.appointment.count({
      where: {
        doctor: {
          specialtyId,
        },
        slot: {
          startAt: {
            gte: new Date(),
          },
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
    });

    if (upcomingAppointments > 0) {
      reasons.push(
        `Tiene ${upcomingAppointments} cita(s) futura(s) programada(s). Debe cancelar o completar las citas antes de desactivar.`,
      );
    }

    // ⚠️ Advertencias adicionales (informativas, no bloquean)
    if (totalDoctors > activeDoctors) {
      warnings.push(
        `Tiene ${totalDoctors - activeDoctors} doctor(es) inactivo(s) que también están asociados a esta especialidad.`,
      );
    }

    return {
      canDeactivate: reasons.length === 0,
      reasons,
      warnings,
      metadata: {
        totalDoctors,
        activeDoctors,
        upcomingAppointments,
      },
    };
  }
}
