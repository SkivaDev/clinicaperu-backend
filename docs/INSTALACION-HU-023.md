# Instalación y Prueba - HU-023: Atomic Booking (Patient)

## Resumen de Implementación

Se ha implementado la **HU-023: Atomic Booking (Patient)** con las siguientes características críticas:

✅ Endpoint `POST /appointments` con reserva atómica  
✅ Transacción con FOR UPDATE NOWAIT (lock pesimista)  
✅ Validaciones de negocio completas  
✅ Manejo de deadlocks con retry y backoff  
✅ Timeout de 5 segundos  
✅ Rollback automático en errores  
✅ Logging con request_id para tracking  
✅ Garantía de 0% double bookings

---

## Archivos Creados

```
src/
└── appointments/
    ├── dto/
    │   ├── book-appointment.dto.ts          [NUEVO]
    │   └── booking-response.dto.ts          [NUEVO]
    ├── booking.service.ts                   [NUEVO]
    ├── appointments.controller.ts           [MODIFICADO]
    ├── appointments.module.ts               [MODIFICADO]
    ├── HU-023-ATOMIC-BOOKING.md            [NUEVO]
    └── INSTALACION-HU-023.md                [NUEVO]
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
- Token JWT válido de un paciente (obtener mediante login)
- Slots disponibles en la base de datos

### 1. Obtener Token de Autenticación (Paciente)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "password123"
  }'
```

Guardar el `accessToken` de la respuesta.

### 2. Obtener Slots Disponibles

```bash
curl -X GET "http://localhost:3000/calendar/events?start=2025-10-01T00:00:00Z&end=2025-10-31T23:59:59Z&status=FREE" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Copiar el `id` de un slot libre.

### 3. Reservar un Slot (Booking Atómico)

```bash
curl -X POST http://localhost:3000/appointments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-request-id: req_test_001" \
  -d '{
    "slotId": "YOUR_SLOT_ID",
    "reason": "Consulta general",
    "notes": "Primera vez en la clínica"
  }'
```

**Respuesta Esperada (201 Created):**
```json
{
  "statusCode": 201,
  "message": "Appointment booked successfully",
  "data": {
    "id": "appt_xxx",
    "slotId": "slot_xxx",
    "userId": "user_xxx",
    "doctorId": "doctor_xxx",
    "startAt": "2025-10-15T09:00:00.000Z",
    "endAt": "2025-10-15T09:30:00.000Z",
    "status": "PENDING",
    "reason": "Consulta general",
    "notes": "Primera vez en la clínica",
    "createdAt": "2025-10-10T10:00:00.000Z",
    "doctor": {
      "id": "doctor_xxx",
      "name": "Dr. John Smith",
      "specialty": "Cardiología"
    },
    "clinic": {
      "id": "clinic_xxx",
      "name": "Clínica Lima"
    }
  }
}
```

### 4. Intentar Reservar el Mismo Slot (Debe Fallar)

```bash
curl -X POST http://localhost:3000/appointments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-request-id: req_test_002" \
  -d '{
    "slotId": "SAME_SLOT_ID",
    "reason": "Otra consulta"
  }'
```

**Respuesta Esperada (409 Conflict):**
```json
{
  "statusCode": 409,
  "message": "Slot is not available for booking",
  "error": "Conflict"
}
```

---

## Pruebas de Concurrencia (Avanzado)

### Simular 10 Requests Concurrentes

Crear un script `test-concurrency.sh`:

```bash
#!/bin/bash

TOKEN="YOUR_ACCESS_TOKEN"
SLOT_ID="YOUR_SLOT_ID"

# Lanzar 10 requests en paralelo
for i in {1..10}; do
  curl -X POST http://localhost:3000/appointments \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "x-request-id: req_concurrent_$i" \
    -d "{
      \"slotId\": \"$SLOT_ID\",
      \"reason\": \"Test concurrencia $i\"
    }" &
done

# Esperar a que terminen todos
wait

echo "Todas las requests completadas"
```

Ejecutar:
```bash
chmod +x test-concurrency.sh
./test-concurrency.sh
```

**Resultado Esperado:**
- 1 request retorna 201 Created
- 9 requests retornan 409 Conflict
- 0% double bookings

---

## Verificación de Funcionalidades

### ✅ Checklist de Pruebas

#### Funcionalidad Básica
- [ ] Endpoint responde correctamente
- [ ] Formato de respuesta es correcto
- [ ] Slot se marca como BOOKED
- [ ] Appointment se crea correctamente
- [ ] Datos del doctor y clínica incluidos

#### Validaciones
- [ ] Rechaza slot con status != FREE
- [ ] Rechaza slot inactivo
- [ ] Rechaza slot en el pasado
- [ ] Rechaza si paciente tiene 5+ citas pendientes
- [ ] Valida campos requeridos (slotId, reason)

#### Concurrencia
- [ ] Solo 1 request exitoso en concurrencia
- [ ] Resto recibe 409 Conflict
- [ ] No hay double bookings
- [ ] Transacción es atómica

#### Manejo de Errores
- [ ] Rollback en caso de error
- [ ] Timeout después de 5 segundos
- [ ] Retry en deadlock funciona
- [ ] Mensajes de error claros

#### Logging
- [ ] Request ID aparece en logs
- [ ] Logs de inicio y fin de transacción
- [ ] Logs de retry en deadlock
- [ ] Audit log registrado

---

## Monitoreo de Logs

### Ver Logs en Tiempo Real

```bash
# En la terminal donde corre el servidor
npm run start:dev

# Buscar logs de booking
# Ejemplo de logs esperados:
[INFO] [req_test_001] Starting atomic booking for user xxx, slot yyy
[INFO] [req_test_001] Transaction completed in 234ms
[AUDIT] Booking created - Appointment: xxx, User: yyy, Slot: zzz, RequestId: req_test_001
```

### Logs de Deadlock (si ocurre)

```
[WARN] [req_test_002] Deadlock detected, retrying (attempt 1/1)
[INFO] [req_test_002] Transaction completed in 345ms
```

---

## Troubleshooting

### Error: "Slot not found"
- Verificar que el slotId sea válido
- Verificar que el slot exista en la base de datos

### Error: "Slot is not available for booking"
- El slot ya fue reservado por otro usuario
- Verificar status del slot en la base de datos
- Obtener otro slot disponible

### Error: "Cannot book slots in the past"
- La fecha del slot es anterior a la fecha actual
- Usar un slot con fecha futura

### Error: "You have reached the maximum number of pending appointments"
- El paciente tiene 5 o más citas pendientes con ese doctor
- Cancelar o completar citas existentes
- Probar con otro doctor

### Error: "Slot is currently being booked by another user"
- Otro usuario está reservando el mismo slot en este momento
- Esperar unos segundos y reintentar
- Usar otro slot disponible

### Error: "Booking failed due to high concurrency"
- Se agotaron los reintentos por deadlock
- Reintentar la operación
- Verificar carga del servidor

### Performance Lenta (> 1 segundo)
- Verificar índices en tabla Slot
- Verificar índices en tabla Appointment
- Monitorear queries lentas en PostgreSQL
- Verificar conexiones a la base de datos

---

## Verificación en Base de Datos

### Verificar que el Slot se Marcó como BOOKED

```sql
SELECT id, status, "doctorId", "startAt", "endAt"
FROM "Slot"
WHERE id = 'YOUR_SLOT_ID';
```

Resultado esperado: `status = 'BOOKED'`

### Verificar que se Creó el Appointment

```sql
SELECT id, "userId", "doctorId", "slotId", status, reason, "createdAt"
FROM "Appointment"
WHERE "slotId" = 'YOUR_SLOT_ID';
```

Debe existir 1 registro con `status = 'PENDING'`

### Verificar Consistencia (No Double Bookings)

```sql
SELECT "slotId", COUNT(*) as count
FROM "Appointment"
GROUP BY "slotId"
HAVING COUNT(*) > 1;
```

Resultado esperado: **0 filas** (no debe haber slots con múltiples appointments)

---

## Performance Benchmarking

### Medir Tiempo de Respuesta

```bash
# Usar curl con timing
curl -X POST http://localhost:3000/appointments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slotId": "YOUR_SLOT_ID",
    "reason": "Test performance"
  }' \
  -w "\nTime: %{time_total}s\n"
```

**Objetivo:** < 0.3 segundos (300ms)

### Load Testing con Apache Bench

```bash
# Instalar Apache Bench
# Ubuntu/Debian: sudo apt-get install apache2-utils
# macOS: brew install httpd

# Crear archivo con el body
echo '{"slotId":"YOUR_SLOT_ID","reason":"Load test"}' > body.json

# Ejecutar 100 requests (no concurrentes, secuenciales)
ab -n 100 -c 1 -T 'application/json' -H 'Authorization: Bearer YOUR_TOKEN' \
  -p body.json http://localhost:3000/appointments
```

---

## Próximos Pasos

1. ✅ Implementación completada
2. ⏳ Implementar tests unitarios
3. ⏳ Implementar tests de integración
4. ⏳ Implementar tests E2E
5. ⏳ Implementar tests de concurrencia automatizados
6. ⏳ Integrar con sistema de emails real
7. ⏳ Crear tabla de AuditLog
8. ⏳ Actualizar Swagger/OpenAPI
9. ⏳ Configurar monitoreo en producción
10. ⏳ Load testing con 100 requests concurrentes

---

## Notas Importantes

### Transacción Atómica
- Usa `FOR UPDATE NOWAIT` para lock pesimista
- Nivel de aislamiento: Serializable
- Timeout: 5 segundos
- Rollback automático en errores

### Manejo de Concurrencia
- Solo 1 usuario puede reservar un slot específico
- Otros usuarios reciben 409 Conflict inmediatamente
- No hay esperas largas ni timeouts

### Retry en Deadlocks
- Detecta deadlocks automáticamente
- Reintentar 1 vez con backoff de 100ms
- Falla después de 1 retry

### Request ID
- Usar header `x-request-id` para tracking
- Auto-generado si no se proporciona
- Útil para debugging y auditoría

---

## Documentación Adicional

Ver `src/appointments/HU-023-ATOMIC-BOOKING.md` para documentación técnica completa.

---

**Versión:** 1.0.0  
**Fecha:** Octubre 2025  
**Estado:** ✅ Implementado y listo para pruebas  
**Prioridad:** CRÍTICA
