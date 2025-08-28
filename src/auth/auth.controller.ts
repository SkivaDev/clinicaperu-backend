import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser } from './types/user-without-password';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    await this.authService.register(registerDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'User registered successfully',
    };
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Request() req: { user: AuthenticatedUser },
    @Body() loginDto: LoginDto,
  ) {
    // El LocalAuthGuard ya validó las credenciales
    // req.user contiene la información del usuario validado
    const token = await this.authService.login(req.user);

    return {
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      data: {
        access_token: token,
        user: {
          id: req.user.id,
          email: req.user.email,
          names: req.user.names,
          fatherSurname: req.user.fatherSurname,
          motherSurname: req.user.motherSurname,
        },
      },
    };
  }
}
