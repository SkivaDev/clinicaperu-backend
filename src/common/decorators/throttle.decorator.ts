import { Throttle } from '@nestjs/throttler';

/**
 * Rate limiting personalizado para endpoints de autenticación
 * Más restrictivo para prevenir brute force attacks
 * 
 * Límites:
 * - 3 requests por segundo
 * - 10 requests por minuto
 * - 20 requests por 15 minutos
 */
export const ThrottleAuth = () =>
  Throttle({ default: { ttl: 60000, limit: 10 } });

/**
 * Rate limiting para endpoints públicos de lectura
 * Más generoso pero aún protegido
 * 
 * Límites:
 * - 20 requests por segundo
 * - 200 requests por minuto
 */
export const ThrottlePublic = () =>
  Throttle({ default: { ttl: 60000, limit: 200 } });

/**
 * Rate limiting para operaciones críticas (booking, payments, etc.)
 * Muy restrictivo para prevenir abuso
 * 
 * Límites:
 * - 2 requests por segundo
 * - 10 requests por minuto
 */
export const ThrottleCritical = () =>
  Throttle({ default: { ttl: 60000, limit: 10 } });

/**
 * Deshabilitar rate limiting para endpoints específicos
 * Usar con precaución, solo para webhooks o health checks
 */
export const ThrottleSkip = () =>
  Throttle({ default: { ttl: 1000, limit: 1000000 } });
