import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Primero intenta extraer desde cookies
        (request: Request) => {
          let token = null;
          if (request && request.cookies) {
            token = request.cookies['token']; // Cookie con nombre "token"
          }
          return token;
        },
        // 2. Si no encuentra en cookies, busca en Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      // Pasar el request para acceder a cookies
      passReqToCallback: false,
    });
  }

  /**
   * ✅ SEGURIDAD: Valida que el usuario siga activo en la base de datos
   * Esto previene que usuarios desactivados sigan usando tokens válidos
   */
  async validate(payload: any) {
    // Verificar que el usuario existe y está activo
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return {
      userId: payload.sub,
      dni: payload.dni,
      role: payload.role,
    };
  }
}
