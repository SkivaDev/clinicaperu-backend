import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { PatientsService } from '../patients.service';
import type { UpdatePatientDto } from '../dto/update-patient.dto';

interface PatientDeactivateRequestBody extends Partial<UpdatePatientDto> {
  isActive?: boolean;
}

type PatientDeactivateRequest = Request<
  { id: string },
  unknown,
  PatientDeactivateRequestBody
>;

@Injectable()
export class PatientsDeactivateGuard implements CanActivate {
  constructor(private readonly patientsService: PatientsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<PatientDeactivateRequest>();

    const patientId = request.params.id;
    const body = request.body ?? {};
    const method = request.method;
    const url = request.originalUrl ?? request.url ?? '';

    if (!patientId) {
      throw new ForbiddenException('Patient ID es requerido');
    }

    const isExplicitDeactivateRoute =
      method === 'PATCH' && /\/deactivate(\?.*)?$/.test(url);

    const shouldValidate = isExplicitDeactivateRoute || body.isActive === false;

    if (shouldValidate) {
      const validation = await this.patientsService.canDeactivatePatient(patientId);

      if (!validation.canDeactivate) {
        throw new ForbiddenException({
          message: 'No se puede desactivar el paciente',
          reasons: validation.reasons,

          warnings: validation.warnings,

          metadata: validation.metadata,
        });
      }
    }

    return true;
  }
}
