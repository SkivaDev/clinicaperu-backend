# Guía de Rate Limiting - ClinicaPeru Backend

## 📋 ¿Por qué es necesario?

### Riesgos sin Rate Limiting

1. **💸 Costos Económicos**
   - Consultas SQL ilimitadas → sobrecarga de PostgreSQL
   - Uso excesivo de CPU/memoria en servidor
   - Facturas inesperadas en servicios cloud (Railway, Render, AWS, etc.)
   - **Ejemplo real:** Un ataque DDoS puede generar miles de queries por segundo

2. **🔒 Ataques Comunes**
   - **Brute Force:** 1000+ intentos de login para adivinar contraseñas
   - **DDoS:** Saturación del servidor con requests masivos
   - **Scraping:** Extracción automatizada de datos de doctores/pacientes
   - **Credential Stuffing:** Prueba de credenciales robadas de otras plataformas

3. **⚡ Degradación del Servicio**
   - Lentitud para usuarios legítimos
   - Timeouts de base de datos
   - Caída completa del servidor
   - Experiencia de usuario pésima

## 🛡️ Implementación Actual

### Configuración Global

**Archivo:** `src/app.module.ts`

```typescript
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1000,      // 1 segundo
    limit: 10,      // 10 requests por segundo
  },
  {
    name: 'medium',
    ttl: 60000,     // 1 minuto
    limit: 100,     // 100 requests por minuto
  },
  {
    name: 'long',
    ttl: 900000,    // 15 minutos
    limit: 500,     // 500 requests por 15 minutos
  },
])
```

**¿Por qué estos límites?**

Para un proyecto personal con pocos usuarios, estos límites son:
- ✅ **Generosos** para uso normal
- ✅ **Protectores** contra abuso
- ✅ **Escalables** si crece el tráfico

**Ejemplo de uso normal:**
- Usuario navega por la app: ~5-10 requests/min ✅
- Usuario busca doctores: ~20 requests/min ✅
- Bot malicioso: 100+ requests/seg ❌ BLOQUEADO

### Límites Específicos por Endpoint

#### 🔐 Autenticación (Crítico)

**Endpoints:** `/auth/register`, `/auth/login`

```typescript
@Throttle({ default: { ttl: 60000, limit: 5 } })  // Register
@Throttle({ default: { ttl: 60000, limit: 10 } }) // Login
```

**Razón:** Prevenir brute force attacks

**Escenario bloqueado:**
```
Atacante intenta:
- 10:00:00 → Login con password1 ✅
- 10:00:01 → Login con password2 ✅
- 10:00:02 → Login con password3 ✅
...
- 10:00:10 → Login con password11 ❌ BLOQUEADO (límite alcanzado)
```

#### 💳 Booking (Crítico)

**Endpoints:** `POST /appointments`, `POST /appointments/doctor/appointments`

```typescript
@Throttle({ default: { ttl: 60000, limit: 10 } })  // Pacientes
@Throttle({ default: { ttl: 60000, limit: 20 } })  // Doctores
```

**Razón:** Prevenir spam de reservas y proteger transacciones atómicas

**Escenario bloqueado:**
```
Bot malicioso intenta reservar todos los slots:
- Request 1-10: ✅ Procesadas
- Request 11+: ❌ BLOQUEADAS por 1 minuto
```

#### 📖 Lectura General

**Endpoints:** GET endpoints sin `@Throttle` específico

**Límite:** Global (100 requests/min)

**Razón:** Balance entre usabilidad y protección

## 🎯 Estrategia por Tipo de Endpoint

### Nivel 1: Crítico (Más Restrictivo)
- Login/Register: 5-10 req/min
- Booking: 10-20 req/min
- Payments: 5 req/min
- Password Reset: 3 req/min

### Nivel 2: Moderado
- Búsquedas: 50 req/min
- Listados: 100 req/min
- Perfil: 30 req/min

### Nivel 3: Generoso
- Health checks: Sin límite
- Webhooks: Sin límite
- Assets estáticos: 200 req/min

## 📊 Respuesta cuando se excede el límite

**HTTP Status:** `429 Too Many Requests`

**Headers de respuesta:**
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

**Body:**
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

**Frontend debe:**
1. Mostrar mensaje amigable: "Por favor, espera un momento antes de intentar nuevamente"
2. Deshabilitar botón temporalmente
3. Mostrar countdown si es posible
4. Reintentar después del `Retry-After`

## 🔧 Personalización Avanzada

### Crear Límites Personalizados

**Archivo:** `src/common/decorators/throttle.decorator.ts`

```typescript
// Para endpoints muy sensibles
export const ThrottleCritical = () =>
  Throttle({ default: { ttl: 60000, limit: 10 } });

// Para endpoints públicos
export const ThrottlePublic = () =>
  Throttle({ default: { ttl: 60000, limit: 200 } });
```

**Uso:**
```typescript
@Get('public/doctors')
@ThrottlePublic()
async getPublicDoctors() {
  // ...
}
```

### Excluir Endpoints Específicos

```typescript
import { SkipThrottle } from '@nestjs/throttler';

@Get('health')
@SkipThrottle()
async healthCheck() {
  return { status: 'ok' };
}
```

## 📈 Monitoreo y Ajustes

### Cómo saber si los límites son adecuados

1. **Logs del servidor:**
   ```bash
   # Buscar errores 429
   grep "429" logs/app.log
   ```

2. **Métricas a monitorear:**
   - Número de requests 429 por día
   - Endpoints más afectados
   - IPs que más exceden límites

3. **Señales de límites muy restrictivos:**
   - Usuarios legítimos reportan bloqueos
   - Muchos 429 en horarios normales
   - Quejas de "la app está lenta"

4. **Señales de límites muy permisivos:**
   - Costos de DB aumentan sin razón
   - Servidor se satura en ciertos momentos
   - Logs muestran patrones sospechosos

### Ajustar Límites

**Para aumentar límites (más permisivo):**
```typescript
// Antes
limit: 10

// Después
limit: 20
```

**Para disminuir límites (más restrictivo):**
```typescript
// Antes
limit: 100

// Después
limit: 50
```

**Recomendación:** Ajustar en incrementos del 50% y monitorear por 1 semana.

## 🌍 Consideraciones para Producción

### 1. Rate Limiting por IP vs por Usuario

**Actual:** Por IP (default de Throttler)

**Ventaja:** Protege contra ataques anónimos

**Desventaja:** Usuarios detrás de NAT comparten límite

**Mejora futura:**
```typescript
// Rate limiting por userId
@Throttle({ default: { ttl: 60000, limit: 10 } })
@UseGuards(ThrottlerBehindProxyGuard)
```

### 2. Redis para Producción

**Problema:** En memoria se pierde al reiniciar

**Solución:** Usar Redis como storage

```bash
pnpm add @nestjs/throttler-storage-redis ioredis
```

```typescript
ThrottlerModule.forRoot({
  storage: new ThrottlerStorageRedisService(new Redis({
    host: process.env.REDIS_HOST,
    port: 6379,
  })),
  throttlers: [
    { ttl: 60000, limit: 100 }
  ]
})
```

### 3. Whitelist de IPs

Para APIs internas o servicios de confianza:

```typescript
// src/common/guards/throttler-custom.guard.ts
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    
    // IPs whitelisteadas (ej: servidor de monitoreo)
    const whitelist = ['127.0.0.1', '10.0.0.1'];
    
    return whitelist.includes(ip);
  }
}
```

## 🧪 Testing

### Probar Rate Limiting Localmente

**Con curl:**
```bash
# Hacer 15 requests rápidos al login
for i in {1..15}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 0.1
done

# Resultado esperado:
# Request 1-10: 401 (credenciales inválidas)
# Request 11-15: 429 (rate limit excedido)
```

**Con herramienta de load testing:**
```bash
# Instalar Apache Bench
sudo apt-get install apache2-utils

# 100 requests, 10 concurrentes
ab -n 100 -c 10 http://localhost:3000/auth/login

# Ver cuántos 429 se generaron
```

### Test Unitario

```typescript
describe('Rate Limiting', () => {
  it('should block after 10 login attempts', async () => {
    // Hacer 10 requests
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' })
        .expect(401);
    }

    // Request 11 debe ser bloqueada
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'wrong' })
      .expect(429);
  });
});
```

## 💡 Best Practices

### ✅ DO

1. **Aplicar rate limiting global** como primera línea de defensa
2. **Límites más estrictos en autenticación** (login, register)
3. **Límites moderados en operaciones críticas** (booking, payments)
4. **Monitorear logs** de 429 regularmente
5. **Documentar límites** en README para frontend
6. **Usar Redis en producción** para persistencia
7. **Whitelist IPs internas** (monitoring, CI/CD)

### ❌ DON'T

1. **No usar límites muy restrictivos** en desarrollo
2. **No ignorar errores 429** en logs
3. **No aplicar mismo límite** a todos los endpoints
4. **No olvidar headers** de rate limit en respuestas
5. **No hardcodear límites** (usar variables de entorno)
6. **No bloquear health checks** o webhooks críticos

## 🔐 Seguridad Adicional

Rate limiting es **una capa** de seguridad, no la única:

1. **Validación de input:** Joi, class-validator
2. **Autenticación:** JWT con expiración
3. **Autorización:** Guards por rol
4. **CORS:** Configurado correctamente
5. **Helmet:** Headers de seguridad
6. **Rate Limiting:** ✅ Implementado
7. **SQL Injection:** Prisma previene
8. **XSS:** Sanitización de inputs

## 📚 Recursos

- [NestJS Throttler Docs](https://docs.nestjs.com/security/rate-limiting)
- [OWASP Rate Limiting](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)
- [Redis Storage](https://github.com/kkoomen/nestjs-throttler-storage-redis)

## 🎓 Conclusión

**Para tu proyecto personal:**

✅ **Implementación actual es ADECUADA:**
- Protege contra ataques comunes
- No afecta usuarios legítimos
- Previene costos inesperados
- Fácil de ajustar si crece el tráfico

**Próximos pasos recomendados:**

1. ✅ **Ahora:** Usar configuración actual
2. 📊 **En 1 mes:** Revisar logs de 429
3. 🔧 **Si crece:** Implementar Redis
4. 📈 **Si escala:** Rate limiting por usuario

**Costo de implementación:** $0 (solo pnpm package)

**Beneficio:** Protección contra miles de dólares en costos de ataque

---

**Última actualización:** Octubre 30, 2025  
**Versión:** 1.0.0  
**Autor:** Backend Team - ClinicaPeru
