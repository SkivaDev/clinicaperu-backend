# 🚀 Quick Reference - API Endpoints

## Base URL
```
http://localhost:3000
```

## Autenticación
```http
Authorization: Bearer {token}
```

---

## 📅 HU-020-UI: Schedules Management

| Acción | Método | Endpoint | Permisos |
|--------|--------|----------|----------|
| Listar horarios | GET | `/schedules?doctorId={id}&isActive=true` | Todos |
| Crear horario | POST | `/schedules` | DOCTOR, ADMIN |
| Ver horario | GET | `/schedules/{id}` | Todos |
| Editar horario | PUT | `/schedules/{id}` | DOCTOR (owner), ADMIN |
| Desactivar | DELETE | `/schedules/{id}` | DOCTOR (owner), ADMIN |

### Crear Horario
```json
POST /schedules
{
  "doctorId": "uuid",
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "13:00",
  "slotMinutes": 30
}
```

---

## 🚫 HU-020.5-UI: Doctor Unavailability

| Acción | Método | Endpoint | Permisos |
|--------|--------|----------|----------|
| Listar futuras | GET | `/doctors/{id}/unavailability` | Todos |
| Listar todas | GET | `/doctors/{id}/unavailability/all` | DOCTOR, ADMIN |
| Crear período | POST | `/doctors/{id}/unavailability` | DOCTOR, ADMIN |
| Actualizar | PUT | `/doctors/{id}/unavailability/{id}` | DOCTOR, ADMIN |
| Eliminar | DELETE | `/doctors/{id}/unavailability/{id}` | DOCTOR, ADMIN |

### Crear Período
```json
POST /doctors/{doctorId}/unavailability
{
  "startAt": "2025-11-15T00:00:00.000Z",
  "endAt": "2025-11-15T23:59:59.000Z",
  "reason": "Vacaciones"
}
```

---

## 👨‍⚕️ HU-024-UI: Doctor Book Appointment

| Acción | Método | Endpoint | Permisos |
|--------|--------|----------|----------|
| **Buscar pacientes** ✨ | GET | `/users/search?q={query}&role=PATIENT` | DOCTOR, ADMIN |
| Ver slots libres | GET | `/slots?doctorId={id}&status=FREE` | Todos |
| Reservar para paciente | POST | `/appointments/doctor/appointments` | DOCTOR |
| Ver cita | GET | `/appointments/{id}` | Todos |

### Buscar Pacientes
```http
GET /users/search?q=Juan&role=PATIENT&limit=20
```

**Busca en:** DNI, nombre, apellido, email

**Response:**
```json
{
  "statusCode": 200,
  "message": "Found 3 user(s)",
  "data": [
    {
      "id": "uuid",
      "dni": "87654321",
      "firstName": "Juan",
      "lastName": "Pérez García",
      "email": "patient@example.com",
      "phone": "+51987654321",
      "role": "PATIENT"
    }
  ]
}
```

### Reservar Cita
```json
POST /appointments/doctor/appointments
{
  "slotId": "uuid",
  "patientId": "uuid",
  "reason": "Control post-operatorio",
  "notes": "Seguimiento de cirugía"
}
```

---

## 🔧 Endpoints Auxiliares

```http
GET /doctors/public          # Listar doctores
GET /specialties             # Listar especialidades
GET /clinics                 # Listar clínicas
```

---

## 📦 Estructura de Respuesta

Todas las respuestas siguen este formato:

```json
{
  "statusCode": 200,
  "message": "Success message",
  "data": { /* ... */ }
}
```

---

## ⚠️ Errores Comunes

| Código | Significado | Cuándo ocurre |
|--------|-------------|---------------|
| 400 | Bad Request | Datos inválidos |
| 401 | Unauthorized | Token inválido/expirado |
| 403 | Forbidden | Sin permisos |
| 404 | Not Found | Recurso no existe |
| 409 | Conflict | Overlap de horarios, citas confirmadas |

### Error 409 - Ejemplos

**Horario con slots:**
```json
{
  "statusCode": 409,
  "message": "Cannot update schedule: slots already generated",
  "error": "SCHEDULE_HAS_SLOTS"
}
```

**Citas confirmadas:**
```json
{
  "statusCode": 409,
  "message": "Cannot create unavailability: confirmed appointments exist",
  "error": "CONFIRMED_APPOINTMENTS_EXIST"
}
```

---

## 🧪 Usuarios de Prueba

| Rol | Email | Password | Extras |
|-----|-------|----------|--------|
| Admin | admin@example.com | admin123 | - |
| Paciente | patient@example.com | patient123 | DNI: 87654321 |
| Doctor | dr.ramirez@example.com | doctor123 | CMP: 12345 |
| Doctora | dra.gomez@example.com | doctor456 | CMP: 67890 |

### Más Pacientes

- maria.lopez@example.com (DNI: 45678901)
- carlos.torres@example.com (DNI: 56789012)
- ana.rodriguez@example.com (DNI: 67890123)
- pedro.martinez@example.com (DNI: 78901234)

---

## 💡 Tips Rápidos

### Días de la Semana
```
0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles
4 = Jueves, 5 = Viernes, 6 = Sábado
```

### Slot Minutes Válidos
```
15, 20, 30, 45, 60
```

### Estados de Citas
```
PENDING, CONFIRMED, ATTENDED, CANCELLED, NO_SHOW
```

### Estados de Slots
```
FREE, HELD, BOOKED, BLOCKED
```

---

## 📚 Documentación Completa

Ver `FRONTEND-API-DOCUMENTATION.md` para:
- Ejemplos detallados de requests/responses
- Modelos de datos completos
- Manejo de errores avanzado
- Tips de implementación

---

**Última actualización:** 28 de Octubre, 2025
