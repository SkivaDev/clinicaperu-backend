import { HttpException, HttpStatus } from '@nestjs/common';

export class DoctorAlreadyExistsException extends HttpException {
  constructor(field: string, value: string | number) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: `Ya existe un doctor con el mismo ${field}`,
        error: `El valor '${value}' ya está registrado y debe ser único.`,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class DoctorCannotBeDeactivatedException extends HttpException {
  constructor(reasons: string[], metadata: any) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'No se puede desactivar el doctor',
        reasons,
        metadata,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class DoctorNotFoundException extends HttpException {
  constructor(id: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: `Doctor con ID ${id} no encontrado`,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
