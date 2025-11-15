import { HttpException, HttpStatus } from '@nestjs/common';

export class PatientAlreadyExistsException extends HttpException {
  constructor(field: string, value: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: `Ya existe un paciente con el mismo ${field}`,
        error: `El valor '${value}' ya está registrado y debe ser único.`,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class PatientNotFoundException extends HttpException {
  constructor(id: string | null, metadata?: Record<string, unknown>) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: id
          ? `Paciente con ID ${id} no encontrado`
          : 'Paciente no encontrado',
        metadata,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class PatientCannotBeDeactivatedException extends HttpException {
  constructor(reasons: string[], metadata?: Record<string, unknown>) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'No se puede desactivar el paciente',
        reasons,
        metadata,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
