import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { ClinicsService } from '../clinics.service';

interface ClinicDeactivateRequestBody {
  isActive?: boolean;
}

@Injectable()
export class ClinicDeactivateGuard implements CanActivate {
  constructor(private readonly clinicsService: ClinicsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<
        Request<{ id: string }, unknown, ClinicDeactivateRequestBody>
      >();

    const clinicId = request.params?.id;
    const body = request.body ?? {};
    const method = request.method;
    const url = request.originalUrl || request.url || '';

    if (!clinicId) {
      throw new ForbiddenException('Clinic ID es requerido');
    }

    const isExplicitDeactivateRoute =
      method === 'PATCH' && /\/deactivate(\?.*)?$/.test(url);

    const shouldValidate = isExplicitDeactivateRoute || body.isActive === false;

    if (shouldValidate) {
      const validation = await this.clinicsService.canDeactivateClinic(clinicId);

      if (!validation.canDeactivate) {
        throw new ForbiddenException({
          message: 'No se puede desactivar la clínica',
          reasons: validation.reasons,
          warnings: validation.warnings,
          metadata: validation.metadata,
        });
      }
    }

    return true;
  }
}
