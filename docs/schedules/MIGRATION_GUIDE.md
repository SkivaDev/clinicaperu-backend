# Guía de Migración: Controladores de Schedules Separados por Rol

## 📋 Resumen

Se han creado nuevos controladores separados por rol para mejorar la seguridad y claridad del API:

- **`DoctorSchedulesController`**: Para que los doctores gestionen su propia agenda
- **`AdminSchedulesController`**: Para que los administradores gestionen la agenda de cualquier doctor
- **`AdminSchedulesGeneralController`**: Para endpoints generales de administración

## 🎯 Problema Resuelto

### Antes (❌ Problema)
```typescript
// Frontend enviaba doctorId explícitamente
const { data } = await api.get(`/schedules?doctorId=${doctorId}`);
```

**Problemas:**
- Expone IDs sensibles en el frontend
- El doctor podría manipular el doctorId para ver/modificar agendas de otros
- No aprovecha la autenticación JWT para identificar al doctor

### Después (✅ Solución)
```typescript
// Panel de Doctor - No necesita enviar doctorId
const { data } = await api.get('/doctor/schedules');

// Panel de Admin - doctorId en la URL del recurso
const { data } = await api.get(`/admin/doctors/${doctorId}/schedules`);
```

**Ventajas:**
- El backend identifica al doctor usando el `userId` del token JWT
- No se exponen IDs sensibles
- Rutas más RESTful y semánticas
- Separación clara de responsabilidades

---

## 🚀 Nuevas Rutas

### 1️⃣ Rutas para Doctores (Self-Service)

**Base:** `/doctor/schedules`  
**Autenticación:** JWT + Role.DOCTOR  
**Identificación:** Automática desde el token JWT

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/doctor/schedules` | Crear horario en tu agenda |
| `GET` | `/doctor/schedules` | Obtener todos tus horarios |
| `GET` | `/doctor/schedules/:id` | Obtener un horario específico |
| `PUT` | `/doctor/schedules/:id` | Actualizar un horario |
| `DELETE` | `/doctor/schedules/:id` | Eliminar (desactivar) un horario |
| `GET` | `/doctor/schedules/statistics/summary` | Obtener estadísticas de tu agenda |

**Ejemplo de uso (Frontend - Doctor):**
```typescript
// Hook personalizado para doctores
export function useDoctorSchedules() {
  const { data, isLoading } = useQuery({
    queryKey: ['doctor-schedules'],
    queryFn: () => api.get('/doctor/schedules'),
  });

  const createSchedule = useMutation({
    mutationFn: (schedule: CreateScheduleDto) => 
      api.post('/doctor/schedules', schedule),
  });

  return { schedules: data, isLoading, createSchedule };
}
```

### 2️⃣ Rutas para Administradores

**Base:** `/admin/doctors/:doctorId/schedules`  
**Autenticación:** JWT + Role.ADMIN  
**Identificación:** doctorId explícito en la URL

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/admin/doctors/:doctorId/schedules` | Crear horario para un doctor |
| `GET` | `/admin/doctors/:doctorId/schedules` | Obtener horarios de un doctor |
| `GET` | `/admin/doctors/:doctorId/schedules/:id` | Obtener horario específico |
| `PUT` | `/admin/doctors/:doctorId/schedules/:id` | Actualizar horario |
| `DELETE` | `/admin/doctors/:doctorId/schedules/:id` | Eliminar horario |
| `GET` | `/admin/doctors/:doctorId/schedules/statistics/summary` | Estadísticas |
| `POST` | `/admin/doctors/:doctorId/schedules/regenerate/slots` | Regenerar slots |
| `PUT` | `/admin/doctors/:doctorId/schedules/:id/reactivate` | Reactivar horario |

**Rutas generales de admin:**

**Base:** `/admin/schedules`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/admin/schedules` | Listar todos los horarios (con filtros) |
| `GET` | `/admin/schedules/:id` | Obtener cualquier horario por ID |

**Ejemplo de uso (Frontend - Admin):**
```typescript
// Hook personalizado para administradores
export function useAdminDoctorSchedules(doctorId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-schedules', doctorId],
    queryFn: () => api.get(`/admin/doctors/${doctorId}/schedules`),
  });

  const createSchedule = useMutation({
    mutationFn: (schedule: CreateScheduleDto) => 
      api.post(`/admin/doctors/${doctorId}/schedules`, schedule),
  });

  return { schedules: data, isLoading, createSchedule };
}
```

---

## 🔄 Plan de Migración

### Fase 1: Implementación (✅ COMPLETADO)
- [x] Crear `DoctorSchedulesController`
- [x] Crear `AdminSchedulesController` y `AdminSchedulesGeneralController`
- [x] Registrar controladores en `SchedulesModule`
- [x] Mantener controladores legacy para compatibilidad

### Fase 2: Migración del Frontend (🔄 PENDIENTE)

#### Para el Panel de Doctor:

**Antes:**
```typescript
// ❌ Expone doctorId
const useSchedules = (doctorId: string) => {
  return useQuery({
    queryKey: ['schedules', doctorId],
    queryFn: () => api.get(`/schedules?doctorId=${doctorId}`),
  });
};
```

**Después:**
```typescript
// ✅ No necesita doctorId
const useDoctorSchedules = () => {
  return useQuery({
    queryKey: ['doctor-schedules'],
    queryFn: () => api.get('/doctor/schedules'),
  });
};
```

#### Para el Panel de Admin:

**Antes:**
```typescript
// ❌ Query param
const useSchedules = (doctorId: string) => {
  return useQuery({
    queryKey: ['schedules', doctorId],
    queryFn: () => api.get(`/schedules?doctorId=${doctorId}`),
  });
};
```

**Después:**
```typescript
// ✅ RESTful resource path
const useAdminDoctorSchedules = (doctorId: string) => {
  return useQuery({
    queryKey: ['admin-schedules', doctorId],
    queryFn: () => api.get(`/admin/doctors/${doctorId}/schedules`),
  });
};
```

### Fase 3: Deprecación (📅 FUTURO)

Una vez migrado el frontend:

1. Marcar controladores legacy como `@deprecated` en Swagger
2. Agregar headers de deprecación en las respuestas
3. Notificar a los consumidores del API
4. Después de un período de gracia, eliminar los controladores legacy

---

## 🔐 Seguridad

### DoctorSchedulesController

```typescript
// El guard verifica automáticamente que el usuario sea DOCTOR
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)

// El doctorId se obtiene del userId del token JWT
private async getDoctorIdFromUser(userId: string): Promise<string> {
  const doctor = await this.prisma.doctor.findUnique({
    where: { userId },
    select: { id: true },
  });
  return doctor.id;
}
```

**Ventajas:**
- El doctor **nunca** puede acceder a horarios de otros doctores
- No hay forma de manipular el `doctorId` desde el frontend
- La autenticación JWT garantiza la identidad

### AdminSchedulesController

```typescript
// Solo administradores pueden acceder
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)

// El doctorId se recibe explícitamente en la URL
@Param('doctorId') doctorId: string
```

**Ventajas:**
- Separación clara de privilegios
- Los administradores pueden gestionar cualquier doctor
- Rutas RESTful que reflejan la jerarquía de recursos

---

## 📝 Ejemplos Completos

### Frontend - Hook para Doctor

```typescript
// hooks/useDoctorSchedules.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ScheduleResponseDto, CreateScheduleDto } from '@/types';

export function useDoctorSchedules() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<ScheduleResponseDto[]>({
    queryKey: ['doctor-schedules'],
    queryFn: async () => {
      const response = await api.get('/doctor/schedules');
      return response.data.data;
    },
  });

  const createSchedule = useMutation({
    mutationFn: async (schedule: Omit<CreateScheduleDto, 'doctorId'>) => {
      const response = await api.post('/doctor/schedules', schedule);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-schedules'] });
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateScheduleDto> }) => {
      const response = await api.put(`/doctor/schedules/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-schedules'] });
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/doctor/schedules/${id}`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-schedules'] });
    },
  });

  return {
    schedules: data,
    isLoading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}
```

### Frontend - Hook para Admin

```typescript
// hooks/useAdminDoctorSchedules.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ScheduleResponseDto, CreateScheduleDto } from '@/types';

export function useAdminDoctorSchedules(doctorId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<ScheduleResponseDto[]>({
    queryKey: ['admin-schedules', doctorId],
    queryFn: async () => {
      const response = await api.get(`/admin/doctors/${doctorId}/schedules`);
      return response.data.data;
    },
    enabled: !!doctorId,
  });

  const createSchedule = useMutation({
    mutationFn: async (schedule: Omit<CreateScheduleDto, 'doctorId'>) => {
      const response = await api.post(
        `/admin/doctors/${doctorId}/schedules`,
        schedule
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-schedules', doctorId] });
    },
  });

  const regenerateSlots = useMutation({
    mutationFn: async () => {
      const response = await api.post(
        `/admin/doctors/${doctorId}/schedules/regenerate/slots`
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-schedules', doctorId] });
    },
  });

  return {
    schedules: data,
    isLoading,
    error,
    createSchedule,
    regenerateSlots,
  };
}
```

---

## 🧪 Testing

### Probar Rutas de Doctor

```bash
# Login como doctor
POST /auth/login
{
  "email": "doctor@example.com",
  "password": "password"
}

# Crear horario (sin enviar doctorId)
POST /doctor/schedules
Authorization: Bearer <token>
{
  "dayOfWeek": 1,
  "startTime": "08:00",
  "endTime": "12:00",
  "slotMinutes": 30
}

# Obtener mis horarios
GET /doctor/schedules
Authorization: Bearer <token>
```

### Probar Rutas de Admin

```bash
# Login como admin
POST /auth/login
{
  "email": "admin@example.com",
  "password": "password"
}

# Crear horario para un doctor específico
POST /admin/doctors/{doctorId}/schedules
Authorization: Bearer <token>
{
  "dayOfWeek": 1,
  "startTime": "08:00",
  "endTime": "12:00",
  "slotMinutes": 30
}

# Obtener horarios de un doctor
GET /admin/doctors/{doctorId}/schedules
Authorization: Bearer <token>
```

---

## 📚 Recursos Adicionales

- **Swagger UI**: `/api/docs` - Documentación interactiva de todos los endpoints
- **Código fuente**:
  - `src/schedules/doctor.schedules.controller.ts`
  - `src/schedules/admin.schedules.controller.ts`
  - `src/schedules/schedules.module.ts`

---

## ❓ FAQ

### ¿Por qué separar los controladores?

1. **Seguridad**: Evita que los doctores puedan manipular IDs para acceder a datos de otros
2. **Claridad**: Las rutas reflejan claramente quién puede hacer qué
3. **RESTful**: Sigue las mejores prácticas de diseño de APIs
4. **Mantenibilidad**: Código más fácil de entender y mantener

### ¿Qué pasa con los controladores legacy?

Se mantienen temporalmente para compatibilidad. Una vez migrado el frontend, se deprecarán y eventualmente se eliminarán.

### ¿Necesito cambiar algo en el servicio?

No. El `SchedulesService` sigue siendo el mismo. Solo cambia cómo los controladores obtienen el `doctorId`.

### ¿Cómo migro mi frontend?

1. Identifica si el usuario es DOCTOR o ADMIN
2. Usa el hook correspondiente (`useDoctorSchedules` o `useAdminDoctorSchedules`)
3. Para doctores: elimina el parámetro `doctorId` de las llamadas
4. Para admins: mueve el `doctorId` a la URL del recurso

---

**Fecha de creación:** 2025-10-29  
**Autor:** Sistema de migración de schedules  
**Versión:** 1.0.0
