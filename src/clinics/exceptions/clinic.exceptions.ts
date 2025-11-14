import { HttpException, HttpStatus } from '@nestjs/common';

export class ClinicAlreadyExistsException extends HttpException {
  constructor(field: string, value: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: `Ya existe una clínica con el mismo ${field}`,
        error: `El valor '${value}' ya está registrado y debe ser único.`,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class ClinicNotFoundException extends HttpException {
  constructor(id: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: `Clínica con ID ${id} no encontrada`,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ClinicUpdateNotAllowedException extends HttpException {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        metadata,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ClinicCannotBeDeactivatedException extends HttpException {
  constructor(reasons: string[], metadata: Record<string, unknown>) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'No se puede desactivar la clínica',
        reasons,
        metadata,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
