# HU-026: Cancelación y Reprogramación de Citas

## 📋 Resumen

Implementación completa del sistema de cancelación y reprogramación de citas médicas con validaciones de negocio, transacciones atómicas y notificaciones por email.

**Prioridad**: ALTA  
**Estado**: ✅ COMPLETADO  
**Fecha de implementación**: Octubre 2025

---

## 🎯 Funcionalidades Implementadas

### 1. Cancelación de Citas (`DELETE /appointments/:id`)

Permite a usuarios autorizados cancelar citas existentes con las siguientes reglas:

#### Reglas de Negocio:
- ✅ **Pacientes**: Solo pueden cancelar con más de 24 horas de anticipación
- ✅ **Doctores**: Pueden cancelar sin restricción de tiempo
- ✅ **Administradores**: Pueden cancelar sin restricción de tiempo
- ✅ No se pueden cancelar citas ya atendidas
- ✅ No se pueden cancelar citas ya canceladas previamente

#### Proceso Transaccional:
1. Validar existencia y permisos de la cita
2. Validar política de 24 horas (solo para pacientes)
3. Actualizar estado de cita a `CANCELLED`
4. Liberar slot asociado (cambiar a `FREE`)
5. Encolar email de notificación de cancelación

---

### 2. Reprogramación de Citas (`PUT /appointments/:id/reschedule`)

Permite a pacientes y administradores mover una cita a un nuevo slot del mismo doctor.

#### Reglas de Negocio:
- ✅ Solo el paciente propietario o un admin pueden reprogramar
- ✅ Solo se puede reprogramar con más de 24 horas de anticipación
- ✅ El nuevo slot debe estar `FREE` (disponible)
- ✅ El nuevo slot debe pertenecer al mismo doctor
- ✅ El nuevo slot debe ser una fecha futura
- ✅ No se pueden reprogramar citas canceladas o atendidas

#### Proceso Transaccional (Atómico):
1. Validar existencia y permisos de la cita
2. Validar política de 24 horas
3. Bloquear nuevo slot con `FOR UPDATE NOWAIT`
4. Validar disponibilidad del nuevo slot
5. Verificar que el nuevo slot pertenezca al mismo doctor
6. Liberar slot antiguo (cambiar a `FREE`)
7. Reservar nuevo slot (cambiar a `BOOKED`)
8. Actualizar `slotId` de la cita
9. Encolar email de notificación de reprogramación

---

## 📁 Archivos Creados/Modificados

### Archivos Nuevos:

#### 1. `src/appointments/dto/reschedule-appointment.dto.ts`
```typescript
export class RescheduleAppointmentDto {
  @IsUUID()
  @IsNotEmpty()
  newSlotId: string;
}
```

### Archivos Modificados:

#### 2. `src/appointments/appointments.service.ts`
**Métodos agregados:**
- `cancelAppointment(appointmentId, userId, userRole)`: Cancela una cita con validaciones
- `rescheduleAppointment(appointmentId, userId, userRole, dto)`: Reprograma una cita

**Características:**
- ✅ Transacciones atómicas con Prisma
- ✅ Locks pesimistas con `FOR UPDATE NOWAIT`
- ✅ Validación de permisos basada en roles
- ✅ Validación de política de 24 horas
- ✅ Logging detallado de operaciones
- ✅ Encolado de emails de notificación

#### 3. `src/appointments/appointments.controller.ts`
**Endpoints agregados:**
- `DELETE /appointments/:id` - Cancelar cita
- `PUT /appointments/:id/reschedule` - Reprogramar cita

**Características:**
- ✅ Documentación completa con Swagger
- ✅ Guards de autenticación (`JwtAuthGuard`, `RolesGuard`)
- ✅ Decoradores de roles (`@Roles`)
- ✅ Responses tipados con DTOs

---

## 🔐 Seguridad y Permisos

### Matriz de Permisos:

| Acción | Paciente | Doctor | Admin |
|--------|----------|--------|-------|
| Cancelar propia cita | ✅ (>24h) | ✅ | ✅ |
| Cancelar cita de otro | ❌ | ✅ (sus pacientes) | ✅ |
| Reprogramar propia cita | ✅ (>24h) | ❌ | ✅ |
| Reprogramar cita de otro | ❌ | ❌ | ✅ |

---

## 📡 API Endpoints

### 1. Cancelar Cita

**Endpoint:** `DELETE /appointments/:id`

**Autenticación:** Bearer Token (JWT)

**Roles permitidos:** `PATIENT`, `DOCTOR`, `ADMIN`

**Request:**
```http
DELETE /appointments/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d
Authorization: Bearer <token>
```

**Response 200 OK:**
```json
{
  "statusCode": 200,
  "message": "Cita cancelada exitosamente",
  "data": {
    "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "status": "CANCELLED",
    "cancelledAt": "2025-10-28T20:30:00.000Z",
    "userId": "patient-uuid",
    "doctorId": "doctor-uuid",
    "slotId": "slot-uuid",
    "reason": "Consulta general",
    "notes": null,
    "createdAt": "2025-10-20T10:00:00.000Z",
    "updatedAt": "2025-10-28T20:30:00.000Z"
  }
}
```

**Response 400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "No se puede cancelar citas con menos de 24 horas de anticipación. Por favor, contacta con la clínica.",
  "error": "Bad Request"
}
```

**Response 403 Forbidden:**
```json
{
  "statusCode": 403,
  "message": "No tienes permisos para cancelar esta cita",
  "error": "Forbidden"
}
```

**Response 404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Cita no encontrada",
  "error": "Not Found"
}
```

---

### 2. Reprogramar Cita

**Endpoint:** `PUT /appointments/:id/reschedule`

**Autenticación:** Bearer Token (JWT)

**Roles permitidos:** `PATIENT`, `ADMIN`

**Request:**
```http
PUT /appointments/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/reschedule
Authorization: Bearer <token>
Content-Type: application/json

{
  "newSlotId": "new-slot-uuid-here"
}
```

**Response 200 OK:**
```json
{
  "statusCode": 200,
  "message": "Cita reprogramada exitosamente",
  "data": {
    "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "status": "PENDING",
    "userId": "patient-uuid",
    "doctorId": "doctor-uuid",
    "slotId": "new-slot-uuid-here",
    "reason": "Consulta general",
    "notes": null,
    "createdAt": "2025-10-20T10:00:00.000Z",
    "updatedAt": "2025-10-28T20:35:00.000Z"
  }
}
```

**Response 400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "No se puede reprogramar citas con menos de 24 horas de anticipación",
  "error": "Bad Request"
}
```

**Response 409 Conflict:**
```json
{
  "statusCode": 409,
  "message": "El nuevo slot no está disponible para reserva",
  "error": "Conflict"
}
```

---

## 🗄️ Impacto en Base de Datos

### Tablas Afectadas:

#### 1. `Appointment`
- **UPDATE**: Campo `status` → `CANCELLED` (cancelación)
- **UPDATE**: Campo `cancelledAt` → timestamp actual (cancelación)
- **UPDATE**: Campo `slotId` → nuevo slot ID (reprogramación)
- **UPDATE**: Campo `updatedAt` → timestamp actual

#### 2. `Slot`
- **UPDATE**: Campo `status` → `FREE` (liberar slot antiguo)
- **UPDATE**: Campo `status` → `BOOKED` (reservar slot nuevo)

#### 3. `EmailMessage`
- **INSERT**: Nuevo registro para notificación de cancelación/reprogramación

### Transacciones:

Todas las operaciones se ejecutan dentro de **transacciones atómicas** con:
- ✅ Nivel de aislamiento: `Serializable`
- ✅ Locks pesimistas: `FOR UPDATE NOWAIT`
- ✅ Timeout: 5 segundos
- ✅ Rollback automático en caso de error

---

## 🔄 Flujo de Cancelación

```mermaid
graph TD
    A[Usuario solicita cancelar cita] --> B{¿Cita existe?}
    B -->|No| C[404 Not Found]
    B -->|Sí| D{¿Ya está cancelada?}
    D -->|Sí| E[400 Bad Request]
    D -->|No| F{¿Ya está atendida?}
    F -->|Sí| G[400 Bad Request]
    F -->|No| H{¿Usuario autorizado?}
    H -->|No| I[403 Forbidden]
    H -->|Sí| J{¿Es paciente?}
    J -->|Sí| K{¿>24h anticipación?}
    K -->|No| L[400 Bad Request]
    K -->|Sí| M[TRANSACCIÓN]
    J -->|No Doctor/Admin| M
    M --> N[UPDATE Appointment.status = CANCELLED]
    N --> O[UPDATE Slot.status = FREE]
    O --> P[INSERT EmailMessage]
    P --> Q[200 OK - Cita cancelada]
```

---

## 🔄 Flujo de Reprogramación

```mermaid
graph TD
    A[Usuario solicita reprogramar] --> B{¿Cita existe?}
    B -->|No| C[404 Not Found]
    B -->|Sí| D{¿Ya cancelada/atendida?}
    D -->|Sí| E[400 Bad Request]
    D -->|No| F{¿Usuario autorizado?}
    F -->|No| G[403 Forbidden]
    F -->|Sí| H{¿>24h anticipación?}
    H -->|No| I[400 Bad Request]
    H -->|Sí| J[LOCK nuevo slot FOR UPDATE]
    J --> K{¿Slot disponible?}
    K -->|No| L[409 Conflict]
    K -->|Sí| M{¿Mismo doctor?}
    M -->|No| N[400 Bad Request]
    M -->|Sí| O[TRANSACCIÓN]
    O --> P[UPDATE old Slot.status = FREE]
    P --> Q[UPDATE new Slot.status = BOOKED]
    Q --> R[UPDATE Appointment.slotId]
    R --> S[INSERT EmailMessage]
    S --> T[200 OK - Cita reprogramada]
```

---

## 📧 Notificaciones Email

### Plantillas Utilizadas:

#### 1. Cancelación (`BOOKING_CANCELLATION`)
```json
{
  "to": "patient@example.com",
  "subject": "Cita cancelada",
  "template": "BOOKING_CANCELLATION",
  "variables": {
    "patientName": "Juan Pérez",
    "doctorName": "Dr. María García",
    "specialty": "Cardiología",
    "appointmentDate": "2025-11-15T10:00:00Z",
    "cancelledAt": "2025-10-28T20:30:00Z"
  }
}
```

#### 2. Reprogramación (`BOOKING_CONFIRMATION`)
```json
{
  "to": "patient@example.com",
  "subject": "Cita reprogramada",
  "template": "BOOKING_CONFIRMATION",
  "variables": {
    "patientName": "Juan Pérez",
    "doctorName": "Dr. María García",
    "specialty": "Cardiología",
    "oldAppointmentDate": "2025-11-15T10:00:00Z",
    "newAppointmentDate": "2025-11-20T14:00:00Z",
    "rescheduledAt": "2025-10-28T20:35:00Z"
  }
}
```

---

## ✅ Validaciones Implementadas

### Validaciones de Negocio:

1. ✅ **Existencia de cita**: La cita debe existir en la BD
2. ✅ **Estado de cita**: No puede estar ya cancelada o atendida
3. ✅ **Permisos de usuario**: Validación según rol
4. ✅ **Política de 24 horas**: Para pacientes
5. ✅ **Disponibilidad de slot**: El nuevo slot debe estar FREE
6. ✅ **Consistencia de doctor**: Mismo doctor en reprogramación
7. ✅ **Fecha futura**: El nuevo slot debe ser futuro

### Validaciones Técnicas:

1. ✅ **UUID válido**: Validación de formato de IDs
2. ✅ **Autenticación JWT**: Token válido y no expirado
3. ✅ **Autorización**: Rol apropiado para la operación
4. ✅ **Concurrencia**: Locks para prevenir race conditions
5. ✅ **Transaccionalidad**: Rollback automático en errores

---

## 🧪 Casos de Prueba Sugeridos

### Cancelación:

```bash
# ✅ Test 1: Paciente cancela su cita (>24h)
DELETE /appointments/{id}
Expected: 200 OK

# ❌ Test 2: Paciente cancela cita (<24h)
DELETE /appointments/{id}
Expected: 400 Bad Request

# ✅ Test 3: Doctor cancela cita de su paciente
DELETE /appointments/{id}
Expected: 200 OK

# ❌ Test 4: Paciente intenta cancelar cita de otro
DELETE /appointments/{other-patient-id}
Expected: 403 Forbidden

# ❌ Test 5: Cancelar cita ya cancelada
DELETE /appointments/{cancelled-id}
Expected: 400 Bad Request
```

### Reprogramación:

```bash
# ✅ Test 1: Reprogramar a slot válido del mismo doctor
PUT /appointments/{id}/reschedule
Body: { "newSlotId": "valid-slot" }
Expected: 200 OK

# ❌ Test 2: Reprogramar a slot de otro doctor
PUT /appointments/{id}/reschedule
Body: { "newSlotId": "different-doctor-slot" }
Expected: 400 Bad Request

# ❌ Test 3: Reprogramar a slot ya reservado
PUT /appointments/{id}/reschedule
Body: { "newSlotId": "booked-slot" }
Expected: 409 Conflict

# ❌ Test 4: Reprogramar con <24h
PUT /appointments/{near-appointment-id}/reschedule
Expected: 400 Bad Request
```

---

## 🚀 Ejemplos de Uso

### Ejemplo 1: Paciente cancela su cita

```bash
curl -X DELETE \
  'http://localhost:3000/appointments/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

### Ejemplo 2: Paciente reprograma su cita

```bash
curl -X PUT \
  'http://localhost:3000/appointments/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/reschedule' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "newSlotId": "new-slot-uuid-here"
  }'
```

### Ejemplo 3: Doctor cancela cita de su paciente

```bash
curl -X DELETE \
  'http://localhost:3000/appointments/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

---

## 📊 Métricas y Logs

### Logs Generados:

```
[AppointmentsService] User abc-123 (PATIENT) attempting to cancel appointment def-456
[AppointmentsService] Appointment def-456 cancelled successfully by user abc-123 (PATIENT)
```

```
[AppointmentsService] User abc-123 attempting to reschedule appointment def-456 to slot ghi-789
[AppointmentsService] Appointment def-456 rescheduled successfully from slot old-slot to ghi-789
```

### Métricas Sugeridas:
- Total de cancelaciones por día/semana
- Tiempo promedio de anticipación de cancelación
- Porcentaje de cancelaciones <24h rechazadas
- Total de reprogramaciones exitosas
- Slots más reprogramados

---

## 🔧 Configuración y Dependencias

### Variables de Entorno:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/clinic_db
JWT_SECRET=your-secret-key
```

### Dependencias utilizadas:
```json
{
  "@nestjs/common": "^10.x",
  "@prisma/client": "^5.x",
  "class-validator": "^0.14.x",
  "class-transformer": "^0.5.x"
}
```

---

## 📝 Notas de Implementación

### Decisiones Técnicas:

1. **Locks Pesimistas**: Se usa `FOR UPDATE NOWAIT` para prevenir deadlocks
2. **Transacciones Serializables**: Máximo nivel de aislamiento para consistencia
3. **Validación en dos capas**: Controller (sintaxis) y Service (negocio)
4. **Emails asíncronos**: Se encolan para no bloquear la transacción principal
5. **Audit logs**: Se registran todas las operaciones críticas

### Limitaciones Conocidas:

1. ⚠️ Los emails no se envían en tiempo real (requiere worker de cola)
2. ⚠️ No hay sistema de compensación si falla el email
3. ⚠️ La política de 24h es fija (no configurable por clínica)

### Mejoras Futuras:

1. 🔜 Implementar cola de emails con Bull/BullMQ
2. 🔜 Agregar notificaciones push y SMS
3. 🔜 Dashboard de métricas de cancelaciones
4. 🔜 Política de cancelación configurable por clínica
5. 🔜 Sistema de penalizaciones por cancelaciones frecuentes

---

## 🎓 Lecciones Aprendidas

1. **Transacciones atómicas son críticas**: Previenen inconsistencias
2. **Locks previenen race conditions**: FOR UPDATE NOWAIT es clave
3. **Validaciones en capas**: Separar sintaxis de lógica de negocio
4. **Roles claramente definidos**: Matriz de permisos documentada
5. **Emails asíncronos**: No bloquear operaciones principales

---

## ✅ Definición de Hecho (DoD)

- [x] Backend: DELETE /appointments/:id funciona
- [x] Backend: PUT /appointments/:id/reschedule funciona
- [x] Backend: Validación 24h implementada
- [x] Backend: Transacciones atómicas funcionando
- [x] Backend: Emails encolados
- [x] Documentación Swagger completa
- [x] DTOs con validaciones
- [x] Guards de autenticación
- [x] Logging implementado
- [x] Documentación técnica (este archivo)

---

## 📞 Soporte

Para dudas o problemas con esta funcionalidad:
- Revisar logs de `AppointmentsService`
- Verificar estado de transacciones en BD
- Validar permisos de usuario
- Comprobar timestamps de citas (política 24h)

---

**Fecha de última actualización**: Octubre 2025  
**Versión**: 1.0.0  
**Autor**: Sistema de Gestión de Clínica Perú
