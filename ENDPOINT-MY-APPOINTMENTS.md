# Endpoint: Mis Citas (GET /appointments)

## 📋 Resumen

Endpoint que permite a los usuarios autenticados obtener **solo sus citas relevantes** según su rol en el sistema.

---

## 🎯 Funcionalidad por Rol

### 🔵 PATIENT (Paciente)
**Obtiene:** Solo sus propias citas
```sql
WHERE userId = <id-del-paciente-autenticado>
```

**Caso de uso:**
- Ver historial de citas médicas
- Consultar próximas citas
- Revisar citas canceladas

---

### 🟢 DOCTOR (Doctor)
**Obtiene:** Solo las citas de sus pacientes
```sql
WHERE doctorId = <id-del-doctor-autenticado>
```

**Caso de uso:**
- Ver agenda del día
- Consultar historial de pacientes atendidos
- Revisar próximas consultas

---

### 🔴 ADMIN (Administrador)
**Obtiene:** Todas las citas del sistema
```sql
-- Sin filtro WHERE
```

**Caso de uso:**
- Supervisión general del sistema
- Reportes y estadísticas
- Gestión administrativa

---

## 📡 Endpoint

### Request

```http
GET /appointments
Authorization: Bearer <jwt-token>
```

**Headers requeridos:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**No requiere parámetros** - El filtrado es automático según el token JWT

---

### Response 200 OK

```json
{
  "statusCode": 200,
  "message": "Appointments retrieved successfully",
  "data": [
    {
      "id": "appointment-uuid",
      "status": "PENDING",
      "reason": "Consulta general",
      "notes": null,
      "createdAt": "2025-10-20T10:00:00.000Z",
      "updatedAt": "2025-10-20T10:00:00.000Z",
      "confirmedAt": null,
      "cancelledAt": null,
      "attendedAt": null,
      "userId": "patient-uuid",
      "doctorId": "doctor-uuid",
      "slotId": "slot-uuid",
      "slot": {
        "id": "slot-uuid",
        "startAt": "2025-11-15T10:00:00.000Z",
        "endAt": "2025-11-15T10:30:00.000Z",
        "status": "BOOKED"
      },
      "user": {
        "id": "patient-uuid",
        "firstName": "Juan",
        "lastName": "Pérez",
        "email": "juan@example.com",
        "phone": "987654321"
      },
      "doctor": {
        "id": "doctor-uuid",
        "cmp": 12345,
        "user": {
          "firstName": "María",
          "lastName": "García",
          "profileImage": "https://..."
        },
        "specialty": {
          "id": "specialty-uuid",
          "name": "Cardiología"
        },
        "clinic": {
          "id": "clinic-uuid",
          "name": "Clínica Lima",
          "address": "Av. Principal 123"
        }
      }
    }
  ]
}
```

---

## 🔐 Autenticación y Autorización

### ¿Cómo sabe el endpoint qué usuario es?

El endpoint utiliza el **decorador `@CurrentUser()`** de NestJS que extrae la información del usuario desde el **JWT token**.

#### Flujo de Autenticación:

```mermaid
graph LR
    A[Cliente] -->|1. GET /appointments| B[NestJS Controller]
    B -->|2. Extrae JWT| C[JwtAuthGuard]
    C -->|3. Valida token| D[JWT Strategy]
    D -->|4. Decodifica payload| E[@CurrentUser decorator]
    E -->|5. userId + role| F[Service]
    F -->|6. Filtra por userId/role| G[Database]
    G -->|7. Solo citas relevantes| H[Response]
```

#### Código del Decorador:

```typescript
@Get()
@Roles(Role.PATIENT, Role.DOCTOR, Role.ADMIN)
async getMyAppointments(
  @CurrentUser() user: CurrentUserPayload,  // 👈 Extrae userId y role del JWT
): Promise<ResponseDto<AppointmentResponseDto[]>> {
  const appointments = await this.appointmentsService.getMyAppointments(
    user.userId,  // 👈 ID del usuario autenticado
    user.role,    // 👈 Rol del usuario (PATIENT, DOCTOR, ADMIN)
  );

  return {
    statusCode: HttpStatus.OK,
    message: 'Appointments retrieved successfully',
    data: appointments,
  };
}
```

#### Payload del JWT:

Cuando el usuario se autentica, el JWT contiene:

```json
{
  "userId": "abc-123-def-456",
  "email": "juan@example.com",
  "role": "PATIENT",
  "iat": 1698765432,
  "exp": 1698851832
}
```

El `@CurrentUser()` decorator extrae automáticamente este payload y lo pasa al método.

---

## 🔍 Lógica de Filtrado en el Service

```typescript
async getMyAppointments(
  userId: string,
  userRole: Role,
): Promise<AppointmentResponseDto[]> {
  let whereClause: any = {};

  if (userRole === Role.PATIENT) {
    // 🔵 Paciente: solo sus propias citas
    whereClause = { userId };
  } else if (userRole === Role.DOCTOR) {
    // 🟢 Doctor: obtener su doctorId y filtrar por sus citas
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!doctor) {
      throw new BadRequestException('Doctor profile not found');
    }

    whereClause = { doctorId: doctor.id };
  }
  // 🔴 ADMIN: whereClause vacío = todas las citas

  const appointments = await this.prisma.appointment.findMany({
    where: whereClause,
    include: {
      slot: { ... },
      user: { ... },
      doctor: { ... },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return appointments;
}
```

---

## 📊 Ejemplos de Uso

### Ejemplo 1: Paciente obtiene sus citas

**Request:**
```bash
curl -X GET \
  'http://localhost:3000/appointments' \
  -H 'Authorization: Bearer <patient-token>'
```

**JWT Payload:**
```json
{
  "userId": "patient-123",
  "role": "PATIENT"
}
```

**Query ejecutada:**
```sql
SELECT * FROM "Appointment"
WHERE userId = 'patient-123'
ORDER BY createdAt DESC;
```

**Response:** Solo las citas donde `userId = 'patient-123'`

---

### Ejemplo 2: Doctor obtiene citas de sus pacientes

**Request:**
```bash
curl -X GET \
  'http://localhost:3000/appointments' \
  -H 'Authorization: Bearer <doctor-token>'
```

**JWT Payload:**
```json
{
  "userId": "user-doctor-456",
  "role": "DOCTOR"
}
```

**Proceso:**
1. Buscar `Doctor` donde `userId = 'user-doctor-456'` → obtiene `doctorId = 'doctor-789'`
2. Filtrar citas donde `doctorId = 'doctor-789'`

**Query ejecutada:**
```sql
-- Paso 1: Obtener doctorId
SELECT id FROM "Doctor" WHERE userId = 'user-doctor-456';
-- Resultado: doctorId = 'doctor-789'

-- Paso 2: Obtener citas del doctor
SELECT * FROM "Appointment"
WHERE doctorId = 'doctor-789'
ORDER BY createdAt DESC;
```

**Response:** Solo las citas donde el doctor es `'doctor-789'`

---

### Ejemplo 3: Admin obtiene todas las citas

**Request:**
```bash
curl -X GET \
  'http://localhost:3000/appointments' \
  -H 'Authorization: Bearer <admin-token>'
```

**JWT Payload:**
```json
{
  "userId": "admin-999",
  "role": "ADMIN"
}
```

**Query ejecutada:**
```sql
SELECT * FROM "Appointment"
ORDER BY createdAt DESC;
-- Sin filtro WHERE
```

**Response:** Todas las citas del sistema

---

## 🛡️ Seguridad

### Validaciones Implementadas:

1. ✅ **Autenticación JWT**: Token válido y no expirado
2. ✅ **Guard de Roles**: Solo PATIENT, DOCTOR, ADMIN pueden acceder
3. ✅ **Filtrado automático**: No se puede ver citas de otros usuarios
4. ✅ **Validación de perfil**: Doctor debe tener perfil activo

### Protecciones:

- ❌ Un paciente **NO puede** ver citas de otro paciente
- ❌ Un doctor **NO puede** ver citas de otros doctores
- ❌ Sin token JWT → `401 Unauthorized`
- ❌ Token expirado → `401 Unauthorized`
- ❌ Rol no autorizado → `403 Forbidden`

---

## 📋 Estructura de Datos Retornada

### Campos de Appointment:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | UUID de la cita |
| `status` | enum | PENDING, CONFIRMED, ATTENDED, CANCELLED, NO_SHOW |
| `reason` | string | Motivo de la consulta |
| `notes` | string? | Notas adicionales |
| `createdAt` | Date | Fecha de creación |
| `updatedAt` | Date | Última actualización |
| `confirmedAt` | Date? | Fecha de confirmación |
| `cancelledAt` | Date? | Fecha de cancelación |
| `attendedAt` | Date? | Fecha de atención |

### Relaciones Incluidas:

#### `slot` (Información del horario)
```typescript
{
  id: string;
  startAt: Date;      // Inicio de la cita
  endAt: Date;        // Fin de la cita
  status: SlotStatus; // FREE, BOOKED, HELD, BLOCKED
}
```

#### `user` (Información del paciente)
```typescript
{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}
```

#### `doctor` (Información del doctor)
```typescript
{
  id: string;
  cmp: number;
  user: {
    firstName: string;
    lastName: string;
    profileImage: string | null;
  };
  specialty: {
    id: string;
    name: string;
  };
  clinic: {
    id: string;
    name: string;
    address: string;
  };
}
```

---

## 🎨 Casos de Uso en el Frontend

### Vista del Paciente (`/patient/appointments`)

```typescript
// Hook personalizado
const useMyAppointments = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: async () => {
      const response = await fetch('/appointments', {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      return response.json();
    },
  });

  return { appointments: data?.data || [], isLoading };
};

// Componente
function PatientAppointments() {
  const { appointments, isLoading } = useMyAppointments();

  return (
    <div>
      <h1>Mis Citas</h1>
      {appointments.map(appointment => (
        <AppointmentCard
          key={appointment.id}
          doctor={appointment.doctor}
          slot={appointment.slot}
          status={appointment.status}
          onCancel={() => cancelAppointment(appointment.id)}
          onReschedule={() => rescheduleAppointment(appointment.id)}
        />
      ))}
    </div>
  );
}
```

### Vista del Doctor (`/doctor/appointments`)

```typescript
function DoctorAppointments() {
  const { appointments, isLoading } = useMyAppointments();

  // El mismo endpoint, pero el backend filtra por doctorId automáticamente
  return (
    <div>
      <h1>Mis Pacientes</h1>
      {appointments.map(appointment => (
        <PatientAppointmentCard
          key={appointment.id}
          patient={appointment.user}
          slot={appointment.slot}
          status={appointment.status}
          reason={appointment.reason}
          onConfirm={() => confirmAppointment(appointment.id)}
          onCancel={() => cancelAppointment(appointment.id)}
        />
      ))}
    </div>
  );
}
```

---

## 🔄 Filtros Adicionales (Frontend)

El endpoint retorna todas las citas del usuario. El frontend puede filtrarlas:

```typescript
// Filtrar por estado
const pendingAppointments = appointments.filter(
  a => a.status === 'PENDING'
);

const confirmedAppointments = appointments.filter(
  a => a.status === 'CONFIRMED'
);

const cancelledAppointments = appointments.filter(
  a => a.status === 'CANCELLED'
);

// Filtrar por fecha (próximas vs pasadas)
const now = new Date();
const upcomingAppointments = appointments.filter(
  a => new Date(a.slot.startAt) > now
);

const pastAppointments = appointments.filter(
  a => new Date(a.slot.startAt) <= now
);

// Ordenar por fecha
const sortedByDate = [...appointments].sort(
  (a, b) => new Date(a.slot.startAt) - new Date(b.slot.startAt)
);
```

---

## ⚡ Performance

### Optimizaciones Implementadas:

1. ✅ **Índices en BD**: `userId`, `doctorId`, `createdAt`
2. ✅ **Select específico**: Solo campos necesarios en relaciones
3. ✅ **Ordenamiento en BD**: `ORDER BY createdAt DESC`
4. ✅ **Eager loading**: Include de relaciones en una sola query

### Query Performance:

```sql
-- Paciente (índice en userId)
EXPLAIN ANALYZE
SELECT * FROM "Appointment"
WHERE userId = 'patient-123'
ORDER BY createdAt DESC;
-- Usa índice: appointment_userId_createdAt_idx

-- Doctor (índice en doctorId)
EXPLAIN ANALYZE
SELECT * FROM "Appointment"
WHERE doctorId = 'doctor-789'
ORDER BY createdAt DESC;
-- Usa índice: appointment_doctorId_createdAt_idx
```

---

## 🧪 Testing

### Test 1: Paciente obtiene solo sus citas

```typescript
it('should return only patient appointments', async () => {
  const patientToken = generateToken({ userId: 'patient-1', role: 'PATIENT' });
  
  const response = await request(app)
    .get('/appointments')
    .set('Authorization', `Bearer ${patientToken}`)
    .expect(200);

  expect(response.body.data).toHaveLength(3);
  expect(response.body.data.every(a => a.userId === 'patient-1')).toBe(true);
});
```

### Test 2: Doctor obtiene citas de sus pacientes

```typescript
it('should return only doctor appointments', async () => {
  const doctorToken = generateToken({ userId: 'user-doctor-1', role: 'DOCTOR' });
  
  const response = await request(app)
    .get('/appointments')
    .set('Authorization', `Bearer ${doctorToken}`)
    .expect(200);

  expect(response.body.data.every(a => a.doctorId === 'doctor-1')).toBe(true);
});
```

### Test 3: Admin obtiene todas las citas

```typescript
it('should return all appointments for admin', async () => {
  const adminToken = generateToken({ userId: 'admin-1', role: 'ADMIN' });
  
  const response = await request(app)
    .get('/appointments')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);

  expect(response.body.data.length).toBeGreaterThan(10); // Todas las citas
});
```

---

## 📝 Resumen

### ✅ Ventajas de esta Implementación:

1. **Seguridad**: Filtrado automático por usuario
2. **Simplicidad**: Un solo endpoint para todos los roles
3. **Escalabilidad**: Usa índices de BD eficientemente
4. **Mantenibilidad**: Lógica centralizada en el service
5. **DRY**: No duplicar código para cada rol

### 🎯 Respuesta a tu Pregunta:

> **¿Cómo sabe el endpoint qué paciente es?**

**Respuesta:**
1. El cliente envía el JWT token en el header `Authorization`
2. El `JwtAuthGuard` valida y decodifica el token
3. El decorador `@CurrentUser()` extrae `userId` y `role` del payload
4. El service filtra las citas según el `userId` y `role`
5. El paciente solo ve sus propias citas (`WHERE userId = <su-id>`)

**No hay forma de que un paciente vea citas de otro paciente** porque el filtrado se hace en el backend usando el `userId` del JWT, que no puede ser manipulado por el cliente.

---

**Fecha de última actualización**: Octubre 2025  
**Versión**: 1.0.0
