import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * ✅ SEGURIDAD: Rate limiting mejorado por IP
 * Extiende ThrottlerGuard para rastrear por IP en lugar de por usuario
 */
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  /**
   * Genera una clave única basada en la IP del cliente
   * Respeta proxies (Railway, Cloudflare) usando X-Forwarded-For
   */
  protected async getTracker(req: Request): Promise<string> {
    // Obtener IP real considerando proxies
    return Promise.resolve(this.getClientIp(req));
  }

  /**
   * Extrae la IP real del cliente considerando proxies
   */
  private getClientIp(req: Request): string {
    // Railway y Cloudflare usan X-Forwarded-For
    const forwardedFor = req.headers['x-forwarded-for'];

    if (forwardedFor) {
      // X-Forwarded-For puede contener múltiples IPs: "client, proxy1, proxy2"
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }

    // X-Real-IP es otra alternativa común
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback a la IP de conexión directa
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Personaliza el mensaje de error cuando se excede el límite
   */
  protected async getErrorMessage(
    context: ExecutionContext,
    throttlerLimitDetail: { limit: number; ttl: number },
  ): Promise<string> {
    const req = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIp(req);

    return `Too many requests from IP ${ip}. Try again in ${Math.ceil(throttlerLimitDetail.ttl / 1000)} seconds.`;
  }
}
