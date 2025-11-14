import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class DoctorDeactivateGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const doctorId = request.params.id;
    const body = request.body;

    // Solo validar si se intenta desactivar (isActive = false)
    if (body.isActive === false) {
      const validation = await this.validateDeactivation(doctorId);

      if (!validation.canDeactivate) {
        throw new ForbiddenException({
          message: 'No se puede desactivar el doctor',
          reasons: validation.reasons,
          warnings: validation.warnings,
          metadata: validation.metadata,
        });
      }
    }

    return true;
  }

  // ===========================================================================
  // 🔍 Lógica de validación previa a desactivar un Doctor
  // ===========================================================================
  private async validateDeactivation(doctorId: string): Promise<{
    canDeactivate: boolean;
    reasons: string[];
    warnings: string[];
    metadata: {
      upcomingAppointments: number;
      activeSchedules: number;
      activeSlots: number;
      userIsDoctor: boolean;
      specialtyIsActive: boolean;
      clinicIsActive: boolean;
    };
  }> {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Obtener doctor + user + specialty + clinic
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: true,
        specialty: true,
        clinic: true,
      },
    });

    if (!doctor) {
      reasons.push('El doctor no existe.');
      return {
        canDeactivate: false,
        reasons,
        warnings,
        metadata: {
          upcomingAppointments: 0,
          activeSchedules: 0,
          activeSlots: 0,
          userIsDoctor: false,
          specialtyIsActive: false,
          clinicIsActive: false,
        },
      };
    }

    // ===========================================================================
    // 1️⃣ Validar rol del usuario
    // ===========================================================================
    const userIsDoctor = doctor.user.role === Role.DOCTOR;
    if (!userIsDoctor) {
      reasons.push('El usuario asociado no tiene el rol DOCTOR.');
    }

    // ===========================================================================
    // 2️⃣ Validar que la especialidad esté activa
    // ===========================================================================
    const specialtyIsActive = doctor.specialty?.isActive === true;
    if (!specialtyIsActive) {
      reasons.push('La especialidad asociada está inactiva.');
    }

    // ===========================================================================
    // 3️⃣ Validar que la clínica esté activa
    // ===========================================================================
    const clinicIsActive = doctor.clinic?.isActive === true;
    if (!clinicIsActive) {
      reasons.push('La clínica asociada está inactiva.');
    }

    // ===========================================================================
    // 4️⃣ Validar citas futuras
    // ===========================================================================
    const upcomingAppointments = await this.prisma.appointment.count({
      where: {
        doctorId,
        slot: {
          startAt: {
            gte: new Date(),
          },
        },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (upcomingAppointments > 0) {
      reasons.push(
        `El doctor tiene ${upcomingAppointments} cita(s) futura(s) programada(s).`,
      );
    }

    // ===========================================================================
    // 5️⃣ Validar horarios activos
    // ===========================================================================
    const activeSchedules = await this.prisma.schedule.count({
      where: {
        doctorId,
        isActive: true,
      },
    });

    if (activeSchedules > 0) {
      warnings.push(
        `Se desactivarán ${activeSchedules} horario(s) activo(s) del doctor.`,
      );
    }

    // ===========================================================================
    // 6️⃣ Validar slots futuros activos o bloqueados
    // ===========================================================================
    const activeSlots = await this.prisma.slot.count({
      where: {
        schedule: { doctorId },
        startAt: { gte: new Date() },
        status: { in: ['FREE', 'HELD', 'BOOKED'] },
        isActive: true,
      },
    });

    if (activeSlots > 0) {
      reasons.push(
        `El doctor tiene ${activeSlots} slot(s) futuro(s) en estado FREE, HELD o BOOKED.`,
      );
    }

    return {
      canDeactivate: reasons.length === 0,
      reasons,
      warnings,
      metadata: {
        upcomingAppointments,
        activeSchedules,
        activeSlots,
        userIsDoctor,
        specialtyIsActive,
        clinicIsActive,
      },
    };
  }
}
