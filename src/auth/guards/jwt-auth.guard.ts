import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();

    // Verificar si hay token en cookies o en header
    const cookieToken = request.cookies?.['token'];
    const headerToken = request.headers.authorization?.replace('Bearer ', '');

    if (!cookieToken && !headerToken) {
      throw new UnauthorizedException('No se encontró token de autorización');
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // ✅ Solo loggear en desarrollo, nunca en producción
    if (process.env.NODE_ENV === 'development') {
      const request = context.switchToHttp().getRequest<Request>();
      this.logger.debug('Auth check', {
        hasCookie: !!request.cookies?.['token'],
        hasHeader: !!request.headers.authorization,
        hasUser: !!user,
      });
    }

    if (err || !user) {
      throw err || new UnauthorizedException('Token inválido o expirado');
    }

    return user;
  }
}
