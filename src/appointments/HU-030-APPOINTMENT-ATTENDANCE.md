# HU-030: Appointment Attendance Management

## Solución Híbrida Implementada ✅

### Resumen
Sistema híbrido que combina procesamiento automático diario con control manual por parte de los doctores para gestionar la asistencia a citas médicas.

---

## Arquitectura del Sistema

### 🔄 Flujo Completo de una Cita

| Paso | Acción | Estado Inicial | Estado Final | Responsable |
|------|--------|----------------|--------------|-------------|
| **Paso 1** | Paciente agenda cita | - | `CONFIRMED` | Paciente/Admin |
| **Paso 2** | Doctor agenda cita | - | `PENDING` | Doctor |
| **Paso 3** | Día de la cita | `CONFIRMED` | `ATTENDED` / `NO_SHOW` | Sistema + Doctor |

### 🤖 Componente Automático (Sistema)
- **Job diario**: Se ejecuta cada día a las 1:00 AM
- **Lógica**: Todas las citas `CONFIRMED` del día anterior → `NO_SHOW`
- **Job por hora**: Verificación cada hora para citas pasadas (con 30 min de gracia)

### 👨‍⚕️ Componente Manual (Doctores)
- **Endpoint**: `PATCH /appointments/:id/attend`
- **Permisos**: Solo doctor asignado o admin
- **Validaciones**:
  - Cita debe estar en estado `CONFIRMED`
  - Cita debe ser del día actual o pasada
  - Solo el doctor asignado puede marcar

---

## Endpoints Disponibles

### `PATCH /appointments/:id/attend`
**Marcar cita como atendida**

```http
PATCH /appointments/:id/attend
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "statusCode": 200,
  "message": "Cita marcada como atendida exitosamente",
  "data": {
    "id": "appointment-id",
    "status": "ATTENDED",
    "attendedAt": "2025-11-04T10:30:00.000Z",
    "doctor": { "name": "Dr. Smith" },
    "patient": { "name": "John Doe" }
  }
}
```

**Errores:**
- `400`: Cita no está en estado CONFIRMED o es futura
- `403`: Solo el doctor asignado puede marcar asistencia
- `404`: Cita no encontrada

---

## Jobs Automáticos

### `daily-no-show-processing`
- **Horario**: Todos los días a las 1:00 AM (America/Lima)
- **Función**: Procesa citas CONFIRMED del día anterior
- **Acción**: Marca como NO_SHOW si no fueron atendidas
- **Prevención de race conditions**: Verifica estado actual antes de actualizar

### `hourly-no-show-check`
- **Horario**: Cada hora
- **Función**: Verifica citas que ya pasaron (con 30 min de gracia)
- **Acción**: Marca citas CONFIRMED pasadas como NO_SHOW

---

## Validaciones Implementadas

### Para Doctores Marcando Asistencia
```typescript
// Solo CONFIRMED citas
if (appointment.status !== AppointmentStatus.CONFIRMED) {
  throw new BadRequestException('Solo se pueden marcar citas CONFIRMED como atendidas');
}

// Solo citas del día actual o pasadas
if (appointmentStart > now) {
  throw new BadRequestException('No se puede marcar citas futuras como atendidas');
}

// Solo doctor asignado
if (!isDoctorOwner && !isAdmin) {
  throw new ForbiddenException('Solo el doctor asignado puede marcar asistencia');
}
```

### Para Jobs Automáticos
```typescript
// Solo procesa citas CONFIRMED del día anterior
const yesterdayAppointments = await prisma.appointment.findMany({
  where: {
    status: AppointmentStatus.CONFIRMED,
    slot: {
      startAt: { gte: yesterday, lte: yesterdayEnd }
    }
  }
});

// Double-check para evitar race conditions
if (currentAppointment?.status === AppointmentStatus.CONFIRMED) {
  // Marcar como NO_SHOW
}
```

---

## Archivos Creados/Modificados

### Nuevos Archivos
1. **`src/appointments/appointments-cron.service.ts`** - Jobs automáticos
2. **`src/appointments/HU-030-APPOINTMENT-ATTENDANCE.md`** - Esta documentación

### Archivos Modificados
1. **`src/appointments/appointments.service.ts`** - Método `markAsAttended()`
2. **`src/appointments/appointments.controller.ts`** - Endpoint `PATCH /:id/attend`
3. **`src/appointments/appointments.module.ts`** - Registro del cron service

---

## Casos de Uso

### ✅ Paciente Asiste a la Cita
1. **Sistema**: Marca cita como NO_SHOW automáticamente (1:00 AM del día siguiente)
2. **Doctor**: Ve que el paciente sí llegó, marca manualmente como ATTENDED
3. **Resultado**: Estado correcto ATTENDED

### ❌ Paciente NO Asiste
1. **Sistema**: Marca cita como NO_SHOW automáticamente
2. **Doctor**: No hace nada (estado ya es correcto)
3. **Resultado**: Estado NO_SHOW

### ⚡ Corrección Rápida
- **Doctor** puede marcar ATTENDED durante el día si el paciente llega tarde
- **Sistema** respeta cambios manuales (no sobreescribe ATTENDED)

---

## Métricas Disponibles

Los estados ATTENDED/NO_SHOW alimentan las estadísticas de doctores:

```typescript
// Estadísticas de doctores incluyen:
- totalAttended: number
- totalNoShows: number
- noShowRateByMonth: MonthlyNoShowRateDto[]
- attendedByMonth: MonthlyDataDto[]
```

---

## Configuración de Jobs

Los jobs se ejecutan automáticamente cuando la aplicación está corriendo. Para desarrollo local:

```bash
# Los jobs se activan automáticamente con la aplicación
npm run start:dev

# Los jobs se ejecutan según su cron expression:
# - daily-no-show-processing: "0 1 * * *" (1:00 AM diario)
# - hourly-no-show-check: "0 * * * *" (cada hora)
```

---

## Testing

### Pruebas Manuales Recomendadas

1. **Crear cita CONFIRMED**
2. **Esperar al día siguiente** (o modificar fecha manualmente)
3. **Verificar que el job marca como NO_SHOW**
4. **Doctor marca como ATTENDED** si paciente llegó
5. **Verificar estadísticas actualizadas**

### Logs para Monitoreo

```
[AppointmentsCronService] Starting daily no-show processing cron job...
[AppointmentsCronService] Processing appointments from 2025-11-03T00:00:00.000Z to 2025-11-03T23:59:59.999Z
[AppointmentsCronService] Found 5 CONFIRMED appointments from yesterday to process
[AppointmentsCronService] Daily no-show processing completed: 4 appointments marked as NO_SHOW, 0 errors, took 150ms
```

---

## Consideraciones de Producción

1. **Zona Horaria**: Configurada para America/Lima
2. **Monitoreo**: Logs detallados para debugging
3. **Race Conditions**: Double-check de estado antes de actualizar
4. **Performance**: Queries optimizadas con índices existentes
5. **Recuperación**: Jobs son idempotentes (pueden ejecutarse múltiples veces)

---

## Conclusión

La **Solución Híbrida** combina lo mejor de ambos mundos:

- **Automático**: Reduce carga administrativa, asegura consistencia
- **Manual**: Permite correcciones cuando el paciente llega tarde
- **Flexible**: Se adapta a diferentes escenarios clínicos
- **Escalable**: Jobs eficientes que no impactan performance
