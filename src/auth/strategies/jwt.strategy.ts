import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
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

  async validate(payload: any) {
    return {
      userId: payload.sub,
      dni: payload.dni,
      role: payload.role,
    };
  }
}
