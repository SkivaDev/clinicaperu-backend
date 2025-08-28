import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'dni',
      passwordField: 'password',
    });
  }

  async validate(dni: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(dni, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
