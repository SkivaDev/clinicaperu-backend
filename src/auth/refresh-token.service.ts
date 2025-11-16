import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomBytes } from 'crypto';

/**
 * ✅ SEGURIDAD: Servicio para gestionar refresh tokens
 * - Access token: 15 min (corto, vulnerable si robado)
 * - Refresh token: 7 días (largo, para renovar access sin re-login)
 */
@Injectable()
export class RefreshTokenService {
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Genera un nuevo refresh token y lo almacena en BD
   */
  async generateRefreshToken(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    // Generar token aleatorio criptográficamente seguro
    const token = randomBytes(64).toString('hex');

    // Calcular fecha de expiración (7 días desde ahora)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    // Guardar en base de datos
    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return token;
  }

  /**
   * Valida un refresh token y retorna el userId si es válido
   */
  async validateRefreshToken(token: string): Promise<string> {
    // Buscar token en BD
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
            role: true,
          },
        },
      },
    });

    // Validaciones
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshToken.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (new Date() > refreshToken.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!refreshToken.user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Actualizar última vez usado
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { lastUsedAt: new Date() },
    });

    return refreshToken.userId;
  }

  /**
   * Revoca un refresh token específico
   */
  async revokeRefreshToken(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revoca todos los refresh tokens de un usuario (útil para logout global)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Limpia tokens expirados (llamar desde un cron job)
   */
  async cleanExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Genera un nuevo access token (JWT corto)
   */
  generateAccessToken(userId: string, dni: string, role: string): string {
    const payload = {
      sub: userId,
      dni,
      role,
    };

    return this.jwtService.sign(payload, {
      expiresIn: '15m', // ✅ Token corto: 15 minutos
    });
  }
}
