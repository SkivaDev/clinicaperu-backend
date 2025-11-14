import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { DoctorsService } from '../doctors.service';

@Injectable()
export class DoctorDeactivateGuard implements CanActivate {
  constructor(private readonly doctorsService: DoctorsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request<{ id: string }, unknown, { isActive?: boolean }>>();

    const doctorId = request.params?.id;
    const body = request.body ?? {};
    const method = request.method;
    const url = request.originalUrl || request.url || '';

    if (!doctorId) {
      throw new ForbiddenException('Doctor ID es requerido');
    }

    const isExplicitDeactivateRoute =
      method === 'PATCH' && /\/deactivate(\?.*)?$/.test(url);

    const shouldValidate = isExplicitDeactivateRoute || body.isActive === false;
    if (shouldValidate) {
      const validation = await this.doctorsService.canDeactivate(doctorId);

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
}
