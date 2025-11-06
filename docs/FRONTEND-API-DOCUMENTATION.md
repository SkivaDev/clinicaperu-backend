# 📚 Documentación API para Frontend
## Clínica Perú - Backend API Reference

**Versión:** 1.0.0  
**Base URL:** `http://localhost:3000` (desarrollo)  
**Autenticación:** Bearer Token (JWT)

---

## 📑 Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [HU-020-UI: Gestión de Horarios (Schedules)](#hu-020-ui-gestión-de-horarios)
3. [HU-020.5-UI: Indisponibilidad de Doctores](#hu-0205-ui-indisponibilidad-de-doctores)
4. [HU-024-UI: Doctor Reserva para Paciente](#hu-024-ui-doctor-reserva-para-paciente)
5. [Endpoints Auxiliares](#endpoints-auxiliares)
6. [Modelos de Datos](#modelos-de-datos)
7. [Códigos de Error](#códigos-de-error)

---

## 🔐 Autenticación

Todos los endpoints (excepto login/register) requieren autenticación JWT.

### Headers Requeridos

```http
Authorization: Bearer {token}
Content-Type: application/json
```

### Login

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "dr.ramirez@example.com",
  "password": "doctor123"
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "dr.ramirez@example.com",
      "role": "DOCTOR",
      "firstName": "Carlos",
      "lastName": "Ramírez Lopez"
    }
  }
}
```

---

## 📅 HU-020-UI: Gestión de Horarios

### 1. Listar Horarios del Doctor

```http
GET /schedules?doctorId={doctorId}&isActive=true
```

**Query Parameters:**
- `doctorId` (required): ID del doctor
- `isActive` (optional): Filtrar por estado activo (true/false)
- `dayOfWeek` (optional): Filtrar por día de la semana (0-6)

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Horarios obtenidos exitosamente",
  "data": [
    {
      "id": "uuid",
      "dayOfWeek": 1,
      "startTime": "08:00",
      "endTime": "12:00",
      "slotMinutes": 30,
      "isActive": true,
      "effectiveFrom": "2025-01-01T00:00:00.000Z",
      "effectiveTo": null,
      "createdAt": "2025-10-28T00:00:00.000Z",
      "updatedAt": "2025-10-28T00:00:00.000Z",
      "doctor": {
        "id": "uuid",
        "user": {
          "firstName": "Carlos",
          "lastName": "Ramírez Lopez"
        }
      }
    }
  ]
}
```

**Días de la semana:**
- 0 = Domingo
- 1 = Lunes
- 2 = Martes
- 3 = Miércoles
- 4 = Jueves
- 5 = Viernes
- 6 = Sábado

---

### 2. Crear Nuevo Horario

```http
POST /schedules
```

**Permisos:** DOCTOR, ADMIN

**Request Body:**
```json
{
  "doctorId": "uuid",
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "13:00",
  "slotMinutes": 30,
  "effectiveFrom": "2025-11-01T00:00:00.000Z",
  "effectiveTo": null
}
```

**Validaciones:**
- `startTime` debe ser menor que `endTime`
- `slotMinutes` debe ser: 15, 20, 30, 45 o 60
- No debe solaparse con horarios existentes del mismo día
- Los slots deben caber en el rango de tiempo

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "message": "Horario creado exitosamente",
  "data": {
    "id": "uuid",
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "13:00",
    "slotMinutes": 30,
    "isActive": true,
    "effectiveFrom": "2025-11-01T00:00:00.000Z",
    "effectiveTo": null,
    "doctorId": "uuid"
  }
}
```

**Errores Comunes:**
- `409 CONFLICT`: Horario se solapa con uno existente
- `400 BAD_REQUEST`: Datos inválidos
- `404 NOT_FOUND`: Doctor no encontrado

---

### 3. Obtener Horario Específico

```http
GET /schedules/{scheduleId}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Horario encontrado",
  "data": {
    "id": "uuid",
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "13:00",
    "slotMinutes": 30,
    "isActive": true,
    "effectiveFrom": "2025-11-01T00:00:00.000Z",
    "effectiveTo": null,
    "doctor": {
      "id": "uuid",
      "user": {
        "firstName": "Carlos",
        "lastName": "Ramírez Lopez"
      }
    }
  }
}
```

---

### 4. Editar Horario

```http
PUT /schedules/{scheduleId}
```

**Permisos:** DOCTOR (propietario), ADMIN

**Request Body:**
```json
{
  "dayOfWeek": 2,
  "startTime": "10:00",
  "endTime": "14:00",
  "slotMinutes": 45,
  "effectiveFrom": "2025-11-01T00:00:00.000Z"
}
```

**⚠️ IMPORTANTE:** No se puede editar si el horario ya tiene slots generados.

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Horario actualizado exitosamente",
  "data": {
    "id": "uuid",
    "dayOfWeek": 2,
    "startTime": "10:00",
    "endTime": "14:00",
    "slotMinutes": 45,
    "isActive": true
  }
}
```

**Errores:**
- `409 CONFLICT`: El horario tiene slots generados
- `403 FORBIDDEN`: No eres el propietario del horario
- `409 CONFLICT`: Se solapa con otro horario

---

### 5. Desactivar Horario (Soft Delete)

```http
DELETE /schedules/{scheduleId}
```

**Permisos:** DOCTOR (propietario), ADMIN

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Horario desactivado exitosamente",
  "data": {
    "id": "uuid",
    "isActive": false
  }
}
```

**Comportamiento:**
- Marca `isActive = false`
- Desactiva slots futuros libres
- Preserva slots con citas reservadas

---

## 🚫 HU-020.5-UI: Indisponibilidad de Doctores

### 1. Listar Períodos No Disponibles (Futuros)

```http
GET /doctors/{doctorId}/unavailability
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Períodos de no disponibilidad obtenidos exitosamente",
  "data": [
    {
      "id": "uuid",
      "startAt": "2025-11-10T00:00:00.000Z",
      "endAt": "2025-11-12T23:59:59.000Z",
      "reason": "Vacaciones programadas",
      "doctorId": "uuid"
    },
    {
      "id": "uuid",
      "startAt": "2025-12-01T09:00:00.000Z",
      "endAt": "2025-12-01T18:00:00.000Z",
      "reason": "Congreso médico",
      "doctorId": "uuid"
    }
  ]
}
```

**Nota:** Solo retorna períodos futuros o actuales, ordenados por `startAt` ASC.

---

### 2. Listar Todos los Períodos (Incluyendo Pasados)

```http
GET /doctors/{doctorId}/unavailability/all
```

**Permisos:** DOCTOR, ADMIN

**Response:** Similar al anterior pero incluye períodos pasados.

---

### 3. Crear Período de No Disponibilidad

```http
POST /doctors/{doctorId}/unavailability
```

**Permisos:** DOCTOR, ADMIN

**Request Body (Single Date):**
```json
{
  "startAt": "2025-11-15T00:00:00.000Z",
  "endAt": "2025-11-15T23:59:59.000Z",
  "reason": "Día personal"
}
```

**Request Body (Date Range):**
```json
{
  "startAt": "2025-12-20T00:00:00.000Z",
  "endAt": "2025-12-31T23:59:59.000Z",
  "reason": "Vacaciones de fin de año"
}
```

**Validaciones:**
- `startAt` debe ser menor que `endAt`
- No puede crear si hay citas CONFIRMED en el período

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "message": "Período de no disponibilidad creado exitosamente",
  "data": {
    "id": "uuid",
    "startAt": "2025-11-15T00:00:00.000Z",
    "endAt": "2025-11-15T23:59:59.000Z",
    "reason": "Día personal",
    "doctorId": "uuid"
  }
}
```

**Errores:**
- `409 CONFLICT`: Existen citas confirmadas en el período
- `404 NOT_FOUND`: Doctor no encontrado

---

### 4. Actualizar Período

```http
PUT /doctors/{doctorId}/unavailability/{unavailabilityId}
```

**Permisos:** DOCTOR, ADMIN

**Request Body:**
```json
{
  "startAt": "2025-11-16T00:00:00.000Z",
  "endAt": "2025-11-17T23:59:59.000Z",
  "reason": "Conferencia internacional"
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Período actualizado exitosamente",
  "data": {
    "id": "uuid",
    "startAt": "2025-11-16T00:00:00.000Z",
    "endAt": "2025-11-17T23:59:59.000Z",
    "reason": "Conferencia internacional",
    "doctorId": "uuid"
  }
}
```

---

### 5. Eliminar Período

```http
DELETE /doctors/{doctorId}/unavailability/{unavailabilityId}
```

**Permisos:** DOCTOR, ADMIN

**Validación:** No permite eliminar si hay citas confirmadas en el período.

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Período de no disponibilidad eliminado exitosamente",
  "data": null
}
```

**Errores:**
- `409 CONFLICT`: Existen citas confirmadas en el período

---

## 👨‍⚕️ HU-024-UI: Doctor Reserva para Paciente

### 1. Buscar Pacientes ✨ NUEVO

```http
GET /users/search?q={query}&role=PATIENT&limit=20
```

**Permisos:** DOCTOR, ADMIN

**Query Parameters:**
- `q` (required): Término de búsqueda (DNI, nombre, apellido o email)
- `role` (optional): Filtrar por rol (PATIENT, DOCTOR, ADMIN)
- `limit` (optional): Límite de resultados (default: 20, max: 50)

**Ejemplos de búsqueda:**

```http
# Buscar por DNI
GET /users/search?q=87654321&role=PATIENT

# Buscar por nombre
GET /users/search?q=Juan&role=PATIENT

# Buscar por apellido
GET /users/search?q=Pérez&role=PATIENT

# Buscar por email
GET /users/search?q=juan.perez@example.com&role=PATIENT
```

**Response (200 OK):**
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
      "profileImage": "https://example.com/profile.jpg",
      "role": "PATIENT",
      "isActive": true
    },
    {
      "id": "uuid",
      "dni": "45678901",
      "firstName": "María",
      "lastName": "López Sánchez",
      "email": "maria.lopez@example.com",
      "phone": "+51987654321",
      "profileImage": null,
      "role": "PATIENT",
      "isActive": true
    }
  ]
}
```

**Características:**
- Búsqueda case-insensitive
- Solo retorna usuarios activos (`isActive: true`)
- Ordenado por apellido y nombre
- Búsqueda en múltiples campos simultáneamente

---

### 2. Ver Slots Libres del Doctor

```http
GET /slots?doctorId={doctorId}&status=FREE&startDate={date}
```

**Query Parameters:**
- `doctorId` (required): ID del doctor
- `status` (optional): FREE, BOOKED, HELD, BLOCKED
- `startDate` (optional): Fecha inicio (ISO 8601)
- `endDate` (optional): Fecha fin (ISO 8601)

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Slots retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "startAt": "2025-11-01T08:00:00.000Z",
      "endAt": "2025-11-01T08:30:00.000Z",
      "status": "FREE",
      "isActive": true,
      "schedule": {
        "id": "uuid",
        "dayOfWeek": 1,
        "doctor": {
          "id": "uuid",
          "user": {
            "firstName": "Carlos",
            "lastName": "Ramírez Lopez"
          }
        }
      }
    }
  ]
}
```

---

### 3. Reservar Cita para Paciente

```http
POST /appointments/doctor/appointments
```

**Permisos:** DOCTOR

**Request Body:**
```json
{
  "slotId": "uuid",
  "patientId": "uuid",
  "reason": "Control post-operatorio",
  "notes": "Paciente requiere seguimiento de cirugía de rodilla"
}
```

**Validaciones:**
- El slot debe pertenecer al doctor autenticado
- El slot debe estar FREE
- El paciente debe existir

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "message": "Appointment booked successfully by doctor",
  "data": {
    "id": "uuid",
    "status": "CONFIRMED",
    "reason": "Control post-operatorio",
    "notes": "Paciente requiere seguimiento de cirugía de rodilla",
    "confirmedAt": "2025-10-28T20:00:00.000Z",
    "createdAt": "2025-10-28T20:00:00.000Z",
    "slot": {
      "id": "uuid",
      "startAt": "2025-11-01T08:00:00.000Z",
      "endAt": "2025-11-01T08:30:00.000Z",
      "status": "BOOKED"
    },
    "user": {
      "id": "uuid",
      "firstName": "Juan",
      "lastName": "Pérez García",
      "email": "patient@example.com"
    },
    "doctor": {
      "id": "uuid",
      "user": {
        "firstName": "Carlos",
        "lastName": "Ramírez Lopez"
      }
    }
  }
}
```

**Comportamiento:**
- Crea la cita con estado `CONFIRMED` automáticamente
- Marca el slot como `BOOKED`
- Envía email de confirmación al paciente
- Transacción atómica con locks para evitar doble reserva

**Errores:**
- `409 CONFLICT`: El slot ya está reservado
- `403 FORBIDDEN`: El slot no pertenece al doctor
- `404 NOT_FOUND`: Slot o paciente no encontrado

---

### 4. Ver Detalles de Cita

```http
GET /appointments/{appointmentId}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Appointment retrieved successfully",
  "data": {
    "id": "uuid",
    "status": "CONFIRMED",
    "reason": "Control post-operatorio",
    "notes": "Paciente requiere seguimiento",
    "createdAt": "2025-10-28T20:00:00.000Z",
    "confirmedAt": "2025-10-28T20:00:00.000Z",
    "cancelledAt": null,
    "attendedAt": null,
    "slot": {
      "startAt": "2025-11-01T08:00:00.000Z",
      "endAt": "2025-11-01T08:30:00.000Z"
    },
    "user": {
      "firstName": "Juan",
      "lastName": "Pérez García",
      "email": "patient@example.com",
      "phone": "+51987654321"
    },
    "doctor": {
      "user": {
        "firstName": "Carlos",
        "lastName": "Ramírez Lopez"
      },
      "specialty": {
        "name": "Cardiología"
      }
    }
  }
}
```

---

## 🔧 Endpoints Auxiliares

### Listar Doctores

```http
GET /doctors/public
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Doctors retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "cmp": 12345,
      "yearsOfExperience": 15,
      "consultationPrice": 150.0,
      "rating": 4.5,
      "user": {
        "firstName": "Carlos",
        "lastName": "Ramírez Lopez",
        "profileImage": "https://example.com/profile.jpg"
      },
      "specialty": {
        "id": "uuid",
        "name": "Cardiología"
      },
      "clinic": {
        "id": "uuid",
        "name": "Clínica San Pablo Perú"
      }
    }
  ]
}
```

---

### Listar Especialidades

```http
GET /specialties
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Specialties retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Cardiología",
      "description": "Especialidad médica que se encarga de...",
      "isActive": true
    },
    {
      "id": "uuid",
      "name": "Pediatría",
      "description": "Especialidad médica que se encarga del cuidado...",
      "isActive": true
    }
  ]
}
```

---

### Listar Clínicas

```http
GET /clinics
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Clinics retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Clínica San Pablo Perú",
      "address": "Av. El Polo 789, Santiago de Surco, Lima",
      "phone": "01-610-3333",
      "email": "contacto@sanpabloperu.com",
      "isActive": true
    }
  ]
}
```

---

## 📦 Modelos de Datos

### Schedule (Horario)

```typescript
interface Schedule {
  id: string;
  dayOfWeek: number; // 0-6 (0=Domingo, 6=Sábado)
  startTime: string; // "HH:mm" formato 24h
  endTime: string;   // "HH:mm" formato 24h
  slotMinutes: number; // 15, 20, 30, 45, 60
  isActive: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
  doctorId: string;
}
```

### DoctorUnavailability (Indisponibilidad)

```typescript
interface DoctorUnavailability {
  id: string;
  startAt: Date;
  endAt: Date;
  reason?: string;
  doctorId: string;
}
```

### Slot

```typescript
interface Slot {
  id: string;
  startAt: Date;
  endAt: Date;
  status: 'FREE' | 'HELD' | 'BOOKED' | 'BLOCKED';
  holdExpiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  scheduleId: string;
}
```

### Appointment (Cita)

```typescript
interface Appointment {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'ATTENDED' | 'CANCELLED' | 'NO_SHOW';
  reason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  attendedAt?: Date;
  userId: string;
  doctorId: string;
  slotId: string;
}
```

### UserSearchResult

```typescript
interface UserSearchResult {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profileImage?: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  isActive: boolean;
}
```

---

## ⚠️ Códigos de Error

### Errores Comunes

| Código | Descripción | Solución |
|--------|-------------|----------|
| 400 | Bad Request | Validar datos del request |
| 401 | Unauthorized | Verificar token JWT |
| 403 | Forbidden | Usuario no tiene permisos |
| 404 | Not Found | Recurso no existe |
| 409 | Conflict | Conflicto de negocio (overlap, citas existentes) |
| 500 | Internal Server Error | Error del servidor |

### Ejemplos de Respuestas de Error

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    "startTime must be less than endTime",
    "slotMinutes must be one of: 15, 20, 30, 45, 60"
  ]
}
```

**409 Conflict (Overlap):**
```json
{
  "statusCode": 409,
  "message": "Schedule overlaps with existing schedule",
  "error": "SCHEDULE_OVERLAP"
}
```

**409 Conflict (Citas Confirmadas):**
```json
{
  "statusCode": 409,
  "message": "Cannot create unavailability: confirmed appointments exist in this period",
  "error": "CONFIRMED_APPOINTMENTS_EXIST",
  "details": {
    "appointmentCount": 2
  }
}
```

**409 Conflict (Horario con Slots):**
```json
{
  "statusCode": 409,
  "message": "Cannot update schedule: slots already generated",
  "error": "SCHEDULE_HAS_SLOTS"
}
```

---

## 🧪 Testing con Datos de Seed

### Usuarios de Prueba

**Admin:**
- Email: `admin@example.com`
- Password: `admin123`

**Paciente:**
- Email: `patient@example.com`
- Password: `patient123`
- DNI: `87654321`

**Doctor (Cardiólogo):**
- Email: `dr.ramirez@example.com`
- Password: `doctor123`
- CMP: `12345`

**Doctora (Pediatra):**
- Email: `dra.gomez@example.com`
- Password: `doctor456`
- CMP: `67890`

### Más Pacientes para Búsqueda

| Email | DNI | Nombre Completo |
|-------|-----|-----------------|
| maria.lopez@example.com | 45678901 | María López Sánchez |
| carlos.torres@example.com | 56789012 | Carlos Torres Mendoza |
| ana.rodriguez@example.com | 67890123 | Ana Rodríguez Flores |
| pedro.martinez@example.com | 78901234 | Pedro Martínez Díaz |

### Doctores Adicionales

| Email | Especialidad | CMP |
|-------|--------------|-----|
| dra.fernandez@example.com | Ginecología | 11111 |
| dr.gonzalez@example.com | Traumatología | 22222 |
| dra.sanchez@example.com | Dermatología | 33333 |
| dr.herrera@example.com | Oftalmología | 44444 |

---

## 💡 Tips de Implementación

### 1. Manejo de Fechas

Todas las fechas están en formato ISO 8601 (UTC):
```typescript
// Enviar al backend
const date = new Date('2025-11-01T08:00:00.000Z');
const isoString = date.toISOString();

// Recibir del backend
const receivedDate = new Date(response.data.startAt);
```

### 2. Formato de Horarios

Los horarios usan formato 24h sin segundos:
```typescript
const startTime = "08:00"; // 8:00 AM
const endTime = "18:30";   // 6:30 PM
```

### 3. Días de la Semana

Mapeo de días:
```typescript
const DAYS = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado'
};
```

### 4. Estados de Citas

```typescript
enum AppointmentStatus {
  PENDING = 'PENDING',       // Pendiente de confirmación
  CONFIRMED = 'CONFIRMED',   // Confirmada
  ATTENDED = 'ATTENDED',     // Atendida
  CANCELLED = 'CANCELLED',   // Cancelada
  NO_SHOW = 'NO_SHOW'       // Paciente no se presentó
}
```

### 5. Manejo de Errores

```typescript
try {
  const response = await api.post('/schedules', scheduleData);
  // Manejar éxito
} catch (error) {
  if (error.response?.status === 409) {
    // Conflicto: mostrar mensaje específico
    if (error.response.data.error === 'SCHEDULE_OVERLAP') {
      showError('El horario se solapa con uno existente');
    }
  } else if (error.response?.status === 403) {
    // Sin permisos
    showError('No tienes permisos para esta acción');
  }
}
```

### 6. Búsqueda de Pacientes

```typescript
// Implementar debounce para búsqueda
const searchPatients = debounce(async (query: string) => {
  if (query.length < 3) return; // Mínimo 3 caracteres
  
  const response = await api.get('/users/search', {
    params: { q: query, role: 'PATIENT', limit: 10 }
  });
  
  setPatients(response.data.data);
}, 300);
```

---

## 📞 Soporte

Para dudas o problemas con la API:
- Revisar logs del servidor
- Verificar Swagger UI: `http://localhost:3000/api`
- Contactar al equipo de backend

**Última actualización:** 28 de Octubre, 2025
