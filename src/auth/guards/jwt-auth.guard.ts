import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
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
    const request = context.switchToHttp().getRequest<Request>();

    // Debug info (eliminar en producción)
    console.log('🍪 Cookie token:', !!request.cookies?.['token']);
    console.log('📋 Header token:', !!request.headers.authorization);
    console.log('👤 User found:', !!user);

    if (err || !user) {
      throw err || new UnauthorizedException('Token inválido o expirado');
    }

    return user;
  }
}
