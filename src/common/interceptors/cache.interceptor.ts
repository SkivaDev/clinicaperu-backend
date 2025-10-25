// src/common/interceptors/cache.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

interface CacheEntry {
  data: any;
  timestamp: number;
}

/**
 * Cache Interceptor con TTL configurable
 * Por defecto usa memoria local (puede extenderse a Redis)
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL: number; // Time To Live en milisegundos

  constructor(ttl: number = 60000) {
    // Default: 60 segundos
    this.TTL = ttl;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request);

    // Verificar si existe en cache y no ha expirado
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry) {
      const now = Date.now();
      const age = now - cachedEntry.timestamp;

      if (age < this.TTL) {
        // Cache hit - retornar datos cacheados
        return of(cachedEntry.data);
      } else {
        // Cache expirado - eliminar entrada
        this.cache.delete(cacheKey);
      }
    }

    // Cache miss - ejecutar handler y cachear resultado
    return next.handle().pipe(
      tap((data) => {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }),
    );
  }

  /**
   * Genera una clave única para el cache basada en la URL y query params
   */
  private generateCacheKey(request: any): string {
    const url = request.url;
    const query = JSON.stringify(request.query);
    return `${url}:${query}`;
  }

  /**
   * Limpia el cache completo
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Limpia entradas expiradas del cache
   */
  cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.TTL) {
        this.cache.delete(key);
      }
    }
  }
}
