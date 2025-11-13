import { HttpException, HttpStatus } from '@nestjs/common';

export class SpecialtyNotFoundException extends HttpException {
  constructor(id: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Especialidad no encontrada',
        error: `No se encontró ninguna especialidad con el ID: ${id}`,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class SpecialtyAlreadyExistsException extends HttpException {
  constructor(name: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: 'La especialidad ya existe',
        error: `Ya existe una especialidad con el nombre: ${name}`,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class SpecialtyCannotBeDeactivatedException extends HttpException {
  constructor(reasons: string[], metadata?: any) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'No se puede desactivar la especialidad',
        error:
          'La especialidad tiene dependencias activas que impiden su desactivación',
        reasons,
        metadata,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class SpecialtyCannotBeDeletedException extends HttpException {
  constructor(reasons: string[]) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message: 'No se puede eliminar la especialidad',
        error:
          'La especialidad tiene registros asociados que impiden su eliminación',
        reasons,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
