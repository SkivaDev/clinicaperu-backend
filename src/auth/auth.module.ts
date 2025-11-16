import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { HashingModule } from 'src/common/hashing/hashing.module';
import { RefreshTokenService } from './refresh-token.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  providers: [
    AuthService,
    RefreshTokenService,
    LocalStrategy,
    JwtStrategy,
    ConfigService,
    RolesGuard,
  ],
  controllers: [AuthController],
  imports: [
    UsersModule,
    PassportModule,
    HashingModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' }, // ✅ SEGURIDAD: Access token corto (15 min)
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [RolesGuard],
})
export class AuthModule {}
