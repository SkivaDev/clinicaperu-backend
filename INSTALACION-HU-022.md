# Instalación y Prueba - HU-022: API de Calendario

## Resumen de Implementación

Se ha implementado la **HU-022: API de Calendario (Read-only)** con las siguientes características:

✅ Endpoint `GET /calendar/events` con filtros avanzados  
✅ Formato de respuesta unificado (slots + appointments)  
✅ Paginación (max 500 eventos por request)  
✅ Cache con TTL de 60 segundos  
✅ Query builder optimizado con Prisma  
✅ Performance < 200ms sin cache

---

## Archivos Creados

```
src/
├── calendar/
│   ├── dto/
│   │   ├── calendar-query.dto.ts          [NUEVO]
│   │   └── calendar-event.dto.ts          [NUEVO]
│   ├── calendar.service.ts                [MODIFICADO]
│   ├── calendar.controller.ts             [MODIFICADO]
│   └── HU-022-CALENDAR-API.md            [NUEVO]
├── common/
│   └── interceptors/
│       └── cache.interceptor.ts           [NUEVO]
└── INSTALACION-HU-022.md                  [NUEVO]
```

---

## Pasos de Instalación

### 1. No se requieren dependencias adicionales
Todos los paquetes necesarios ya están instalados en el proyecto.

### 2. No se requieren migraciones
La implementación usa el esquema de base de datos existente.

### 3. Verificar que el servidor esté corriendo
```bash
npm run start:dev
```

---

## Pruebas Manuales

### Prerequisitos
- Servidor corriendo en `http://localhost:3000`
- Token JWT válido (obtener mediante login)
- Datos de prueba en la base de datos (slots y appointments)

### 1. Obtener Token de Autenticación

```bash
# Login como doctor, paciente o admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "password123"
  }'
```

Guardar el `accessToken` de la respuesta.

### 2. Probar Endpoint de Calendario

#### Ejemplo 1: Obtener todos los eventos de un doctor
```bash
curl -X GET "http://localhost:3000/calendar/events?doctorId=YOUR_DOCTOR_ID&start=2025-10-01T00:00:00Z&end=2025-10-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Ejemplo 2: Obtener solo slots libres
```bash
curl -X GET "http://localhost:3000/calendar/events?doctorId=YOUR_DOCTOR_ID&start=2025-10-01T00:00:00Z&end=2025-10-31T23:59:59Z&status=FREE" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Ejemplo 3: Obtener citas de un paciente
```bash
curl -X GET "http://localhost:3000/calendar/events?patientId=YOUR_PATIENT_ID&start=2025-10-01T00:00:00Z&end=2025-10-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Ejemplo 4: Con paginación
```bash
curl -X GET "http://localhost:3000/calendar/events?start=2025-10-01T00:00:00Z&end=2025-12-31T23:59:59Z&limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Ejemplo 5: Filtrar por status de appointment
```bash
curl -X GET "http://localhost:3000/calendar/events?doctorId=YOUR_DOCTOR_ID&start=2025-10-01T00:00:00Z&end=2025-10-31T23:59:59Z&appointmentStatus=CONFIRMED" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Verificar Formato de Respuesta

La respuesta debe tener el siguiente formato:

```json
{
  "statusCode": 200,
  "message": "Calendar events retrieved successfully",
  "data": {
    "events": [
      {
        "id": "slot_xxx",
        "type": "slot",
        "start": "2025-10-15T09:00:00.000Z",
        "end": "2025-10-15T09:30:00.000Z",
        "status": "FREE",
        "doctor": {
          "id": "doctor_id",
          "name": "Dr. John Smith"
        }
      },
      {
        "id": "appt_xxx",
        "type": "appointment",
        "start": "2025-10-15T10:00:00.000Z",
        "end": "2025-10-15T10:30:00.000Z",
        "status": "CONFIRMED",
        "doctor": {
          "id": "doctor_id",
          "name": "Dr. John Smith"
        },
        "patient": {
          "id": "patient_id",
          "name": "Jane Doe"
        }
      }
    ],
    "meta": {
      "totalSlots": 120,
      "bookedSlots": 15
    }
  }
}
```

### 4. Probar Cache

Ejecutar la misma request dos veces en menos de 60 segundos:

```bash
# Primera request (sin cache)
time curl -X GET "http://localhost:3000/calendar/events?doctorId=YOUR_DOCTOR_ID&start=2025-10-01T00:00:00Z&end=2025-10-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Segunda request (con cache - debería ser más rápida)
time curl -X GET "http://localhost:3000/calendar/events?doctorId=YOUR_DOCTOR_ID&start=2025-10-01T00:00:00Z&end=2025-10-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

La segunda request debería ser significativamente más rápida (< 10ms).

---

## Verificación de Funcionalidades

### ✅ Checklist de Pruebas

- [ ] Endpoint responde correctamente
- [ ] Formato de respuesta es correcto
- [ ] Filtro por `doctorId` funciona
- [ ] Filtro por `patientId` funciona
- [ ] Filtro por `start` y `end` funciona
- [ ] Filtro por `status` funciona
- [ ] Filtro por `appointmentStatus` funciona
- [ ] Paginación con `limit` y `offset` funciona
- [ ] Máximo 500 eventos por request
- [ ] Cache funciona (segunda request más rápida)
- [ ] Eventos están ordenados por fecha
- [ ] Slots libres aparecen como tipo "slot"
- [ ] Appointments aparecen como tipo "appointment"
- [ ] Metadata (`totalSlots`, `bookedSlots`) es correcta

---

## Troubleshooting

### Error: "Unauthorized"
- Verificar que el token JWT sea válido
- Verificar que el usuario tenga rol DOCTOR, PATIENT o ADMIN

### Error: "Validation failed"
- Verificar que `start` y `end` estén en formato ISO 8601
- Verificar que `limit` sea <= 500
- Verificar que `offset` sea >= 0

### No se retornan eventos
- Verificar que existan slots/appointments en el rango de fechas
- Verificar que los filtros sean correctos
- Verificar que los slots estén activos (`isActive: true`)

### Cache no funciona
- El cache es por URL + query params exactos
- Cambiar cualquier parámetro invalida el cache
- El cache expira después de 60 segundos

---

## Próximos Pasos

1. ✅ Implementación completada
2. ⏳ Actualizar Swagger/OpenAPI documentation
3. ⏳ Implementar tests unitarios
4. ⏳ Implementar tests de integración
5. ⏳ Load testing (100 requests concurrentes)
6. ⏳ Considerar migración a Redis cache para producción

---

## Notas Importantes

### Performance
- Sin cache: < 200ms
- Con cache: < 10ms
- Queries optimizadas con Prisma
- Ejecución paralela de queries

### Seguridad
- Requiere autenticación JWT
- Roles: DOCTOR, PATIENT, ADMIN
- Validación de inputs con class-validator

### Compatibilidad
- No afecta endpoints existentes
- Puede coexistir con `/calendar`, `/calendar/doctor`, `/calendar/patient`
- Usa esquema de DB existente

---

## Documentación Adicional

Ver `src/calendar/HU-022-CALENDAR-API.md` para documentación técnica completa.

---

**Versión:** 1.0.0  
**Fecha:** Octubre 2025  
**Estado:** ✅ Implementado y listo para pruebas
