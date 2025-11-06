# Frontend Prompt: Admin Patient Management Interface

## Descripción General
Necesito implementar una interfaz de administración completa para gestionar pacientes de la clínica. La interfaz debe permitir listar, ver detalles, crear, editar y desactivar pacientes.

## API Endpoints Disponibles

### Base URL
```
https://api.clinicaperu.com/patients
```

### Autenticación
Todos los endpoints requieren:
- Header: `Authorization: Bearer {token}`
- Rol requerido: `ADMIN`

### Endpoints

#### 1. Listar Todos los Pacientes
```http
GET /patients/admin/all
```

**Response:**
```typescript
{
  statusCode: 200,
  message: "Found X patient(s)",
  data: [
    {
      id: string;
      dni: string;
      firstName: string;
      lastName: string;
      fullName: string;
      email: string;
      phone: string | null;
      gender: "MALE" | "FEMALE";
      dayOfBirth: string; // ISO 8601
      age: number;
      profileImage: string | null;
      role: "PATIENT";
      isActive: boolean;
      createdAt: string; // ISO 8601
      statistics: {
        totalAppointments: number;
        confirmedAppointments: number;
        attendedAppointments: number;
        cancelledAppointments: number;
        lastAppointmentDate: string | null; // ISO 8601
      };
    }
  ]
}
```

#### 2. Obtener Detalle de Paciente
```http
GET /patients/admin/:id
```

**Response:**
```typescript
{
  statusCode: 200,
  message: "Patient found successfully",
  data: {
    id: string;
    dni: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    gender: "MALE" | "FEMALE";
    dayOfBirth: string; // ISO 8601
    age: number;
    profileImage: string | null;
    role: "PATIENT";
    isActive: boolean;
    createdAt: string; // ISO 8601
    updatedAt: string; // ISO 8601
    statistics: {
      totalAppointments: number;
      confirmedAppointments: number;
      attendedAppointments: number;
      cancelledAppointments: number;
      pendingAppointments: number;
      noShowAppointments: number;
    };
    appointments: [
      {
        id: string;
        status: "PENDING" | "CONFIRMED" | "ATTENDED" | "CANCELLED" | "NO_SHOW";
        startAt: string; // ISO 8601
        endAt: string; // ISO 8601
        reason: string | null;
        doctorName: string;
        specialty: string;
        clinic: string;
        createdAt: string; // ISO 8601
      }
    ];
  }
}
```

#### 3. Crear Nuevo Paciente
```http
POST /patients/admin
Content-Type: application/json
```

**Request Body:**
```typescript
{
  dni: string; // 8 dígitos
  email: string;
  password: string; // mínimo 8 caracteres
  firstName: string; // mínimo 2 caracteres
  lastName: string; // mínimo 2 caracteres
  dayOfBirth: string; // ISO 8601 (ej: "1990-05-15")
  phone?: string; // opcional
  gender: "MALE" | "FEMALE";
  profileImage?: string; // opcional
}
```

**Response:**
```typescript
{
  statusCode: 201,
  message: "Patient created successfully",
  data: {
    // Mismo formato que el detalle de paciente
  }
}
```

**Errores Posibles:**
- 409 Conflict: DNI o email ya registrado
- 400 Bad Request: Validación fallida

#### 4. Actualizar Paciente
```http
PUT /patients/admin/:id
Content-Type: application/json
```

**Request Body (todos los campos son opcionales):**
```typescript
{
  email?: string;
  firstName?: string; // mínimo 2 caracteres
  lastName?: string; // mínimo 2 caracteres
  dayOfBirth?: string; // ISO 8601
  phone?: string;
  gender?: "MALE" | "FEMALE";
  profileImage?: string;
  isActive?: boolean;
}
```

**Response:**
```typescript
{
  statusCode: 200,
  message: "Patient updated successfully",
  data: {
    // Mismo formato que el detalle de paciente
  }
}
```

**Errores Posibles:**
- 404 Not Found: Paciente no encontrado
- 409 Conflict: Email ya en uso
- 400 Bad Request: Validación fallida

#### 5. Desactivar Paciente
```http
DELETE /patients/admin/:id
```

**Response:**
```typescript
{
  statusCode: 200,
  message: "Patient deactivated successfully",
  data: {
    message: "Patient deactivated successfully"
  }
}
```

**Errores Posibles:**
- 404 Not Found: Paciente no encontrado

## Requisitos de la Interfaz

### 1. Página Principal: Lista de Pacientes

**Características:**
- Tabla responsiva con las siguientes columnas:
  - Avatar/Foto de perfil
  - Nombre completo
  - DNI
  - Email
  - Teléfono
  - Edad
  - Estado (Activo/Inactivo)
  - Total de citas
  - Última cita
  - Acciones (Ver, Editar, Desactivar)

- Funcionalidades:
  - Búsqueda en tiempo real (por nombre, DNI, email)
  - Filtros:
    - Estado (Activo/Inactivo)
    - Género
    - Rango de edad
  - Ordenamiento por columnas
  - Paginación (20 pacientes por página)
  - Botón "Nuevo Paciente" prominente
  - Indicadores visuales:
    - Badge de estado activo/inactivo
    - Color diferente para pacientes inactivos
    - Indicador si no tiene citas

- Estadísticas en cards superiores:
  - Total de pacientes
  - Pacientes activos
  - Nuevos este mes
  - Promedio de citas por paciente

### 2. Modal/Página: Detalle de Paciente

**Secciones:**

**A. Información Personal (Card superior)**
- Foto de perfil grande
- Nombre completo
- DNI
- Email
- Teléfono
- Fecha de nacimiento y edad
- Género
- Estado (con toggle para activar/desactivar)
- Fecha de registro
- Botón "Editar Información"

**B. Estadísticas de Citas (Cards con iconos)**
- Total de citas
- Citas confirmadas
- Citas atendidas
- Citas canceladas
- Citas pendientes
- No show
- Usar gráficos pequeños o badges de colores

**C. Historial de Citas (Tabla/Timeline)**
- Lista de todas las citas ordenadas por fecha (más reciente primero)
- Mostrar:
  - Fecha y hora
  - Estado (con badge de color)
  - Doctor
  - Especialidad
  - Clínica
  - Motivo
- Filtros por estado de cita
- Paginación si hay muchas citas

### 3. Modal: Crear Nuevo Paciente

**Formulario con validación:**

**Sección 1: Datos Personales**
- DNI (input numérico, exactamente 8 dígitos, validación en tiempo real)
- Nombres (mínimo 2 caracteres)
- Apellidos (mínimo 2 caracteres)
- Email (validación de formato)
- Teléfono (opcional, formato +51XXXXXXXXX)
- Género (radio buttons o select)
- Fecha de nacimiento (date picker, mostrar edad calculada)

**Sección 2: Credenciales**
- Contraseña (mínimo 8 caracteres, mostrar requisitos)
- Confirmar contraseña (validar que coincidan)
- Checkbox "Mostrar contraseña"

**Sección 3: Foto de Perfil (Opcional)**
- Upload de imagen o URL
- Preview de la imagen

**Botones:**
- "Crear Paciente" (primario, deshabilitado si hay errores)
- "Cancelar" (secundario)

**Validaciones en tiempo real:**
- DNI único (verificar con debounce)
- Email único (verificar con debounce)
- Formato de email válido
- Contraseña cumple requisitos
- Contraseñas coinciden
- Todos los campos requeridos completos

### 4. Modal: Editar Paciente

**Similar al formulario de creación pero:**
- No incluir campo de contraseña
- Campos pre-poblados con datos actuales
- Permitir cambiar estado (Activo/Inactivo)
- Validar email único solo si cambió
- Botón "Guardar Cambios"
- Botón "Cancelar"

### 5. Confirmación de Desactivación

**Modal de confirmación:**
- Título: "¿Desactivar paciente?"
- Mensaje: "El paciente [Nombre] será desactivado. No podrá iniciar sesión pero su historial se mantendrá."
- Mostrar información del paciente
- Botones:
  - "Sí, desactivar" (destructivo, color rojo)
  - "Cancelar"

## Stack Tecnológico Recomendado

### Framework y Librerías
- **React** con TypeScript
- **Next.js** (App Router) para SSR/SSG
- **TailwindCSS** para estilos
- **shadcn/ui** para componentes base
- **Lucide React** para iconos
- **React Hook Form** para manejo de formularios
- **Zod** para validación de esquemas
- **TanStack Table** (React Table v8) para tablas avanzadas
- **date-fns** para manejo de fechas
- **axios** o **fetch** para llamadas API
- **React Query** para cache y estado del servidor
- **Sonner** o **React Hot Toast** para notificaciones

### Estructura de Componentes Sugerida

```
src/
├── app/
│   └── admin/
│       └── patients/
│           ├── page.tsx                 # Lista de pacientes
│           └── [id]/
│               └── page.tsx             # Detalle de paciente
├── components/
│   └── admin/
│       └── patients/
│           ├── PatientTable.tsx         # Tabla principal
│           ├── PatientFilters.tsx       # Filtros y búsqueda
│           ├── PatientStats.tsx         # Cards de estadísticas
│           ├── PatientDetailCard.tsx    # Info personal
│           ├── PatientAppointments.tsx  # Historial de citas
│           ├── CreatePatientModal.tsx   # Modal crear
│           ├── EditPatientModal.tsx     # Modal editar
│           └── DeletePatientDialog.tsx  # Confirmación
├── lib/
│   ├── api/
│   │   └── patients.ts                  # API calls
│   ├── types/
│   │   └── patient.ts                   # TypeScript types
│   └── validations/
│       └── patient.ts                   # Zod schemas
└── hooks/
    └── usePatients.ts                   # React Query hooks
```

## Tipos TypeScript

```typescript
// lib/types/patient.ts

export type Gender = "MALE" | "FEMALE";
export type Role = "PATIENT" | "DOCTOR" | "ADMIN";
export type AppointmentStatus = "PENDING" | "CONFIRMED" | "ATTENDED" | "CANCELLED" | "NO_SHOW";

export interface PatientStatistics {
  totalAppointments: number;
  confirmedAppointments: number;
  attendedAppointments: number;
  cancelledAppointments: number;
  lastAppointmentDate: string | null;
}

export interface PatientDetailStatistics extends PatientStatistics {
  pendingAppointments: number;
  noShowAppointments: number;
}

export interface PatientListItem {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  gender: Gender;
  dayOfBirth: string;
  age: number;
  profileImage: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  statistics: PatientStatistics;
}

export interface PatientAppointment {
  id: string;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  reason: string | null;
  doctorName: string;
  specialty: string;
  clinic: string;
  createdAt: string;
}

export interface PatientDetail {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  gender: Gender;
  dayOfBirth: string;
  age: number;
  profileImage: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  statistics: PatientDetailStatistics;
  appointments: PatientAppointment[];
}

export interface CreatePatientInput {
  dni: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dayOfBirth: string;
  phone?: string;
  gender: Gender;
  profileImage?: string;
}

export interface UpdatePatientInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  dayOfBirth?: string;
  phone?: string;
  gender?: Gender;
  profileImage?: string;
  isActive?: boolean;
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}
```

## Esquemas de Validación Zod

```typescript
// lib/validations/patient.ts
import { z } from "zod";

export const createPatientSchema = z.object({
  dni: z.string()
    .length(8, "DNI debe tener exactamente 8 dígitos")
    .regex(/^\d{8}$/, "DNI debe contener solo números"),
  email: z.string()
    .email("Email inválido"),
  password: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string(),
  firstName: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string()
    .min(2, "El apellido debe tener al menos 2 caracteres"),
  dayOfBirth: z.string()
    .refine((date) => !isNaN(Date.parse(date)), "Fecha inválida"),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]),
  profileImage: z.string().url().optional().or(z.literal("")),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export const updatePatientSchema = z.object({
  email: z.string().email("Email inválido").optional(),
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres").optional(),
  dayOfBirth: z.string()
    .refine((date) => !isNaN(Date.parse(date)), "Fecha inválida")
    .optional(),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  profileImage: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});
```

## Funciones API

```typescript
// lib/api/patients.ts
import axios from "axios";
import type {
  PatientListItem,
  PatientDetail,
  CreatePatientInput,
  UpdatePatientInput,
  ApiResponse,
} from "@/lib/types/patient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Configurar axios con interceptor para token
const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // o desde tu estado global
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const patientsApi = {
  // Listar todos los pacientes
  getAll: async (): Promise<PatientListItem[]> => {
    const { data } = await api.get<ApiResponse<PatientListItem[]>>(
      "/patients/admin/all"
    );
    return data.data;
  },

  // Obtener detalle de paciente
  getById: async (id: string): Promise<PatientDetail> => {
    const { data } = await api.get<ApiResponse<PatientDetail>>(
      `/patients/admin/${id}`
    );
    return data.data;
  },

  // Crear paciente
  create: async (input: CreatePatientInput): Promise<PatientDetail> => {
    const { data } = await api.post<ApiResponse<PatientDetail>>(
      "/patients/admin",
      input
    );
    return data.data;
  },

  // Actualizar paciente
  update: async (
    id: string,
    input: UpdatePatientInput
  ): Promise<PatientDetail> => {
    const { data } = await api.put<ApiResponse<PatientDetail>>(
      `/patients/admin/${id}`,
      input
    );
    return data.data;
  },

  // Desactivar paciente
  delete: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<ApiResponse<{ message: string }>>(
      `/patients/admin/${id}`
    );
    return data.data;
  },
};
```

## React Query Hooks

```typescript
// hooks/usePatients.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { patientsApi } from "@/lib/api/patients";
import type { CreatePatientInput, UpdatePatientInput } from "@/lib/types/patient";
import { toast } from "sonner";

export const usePatients = () => {
  return useQuery({
    queryKey: ["patients"],
    queryFn: patientsApi.getAll,
  });
};

export const usePatient = (id: string) => {
  return useQuery({
    queryKey: ["patients", id],
    queryFn: () => patientsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePatientInput) => patientsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Paciente creado exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al crear paciente");
    },
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePatientInput }) =>
      patientsApi.update(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients", variables.id] });
      toast.success("Paciente actualizado exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al actualizar paciente");
    },
  });
};

export const useDeletePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Paciente desactivado exitosamente");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al desactivar paciente");
    },
  });
};
```

## Diseño UI/UX

### Paleta de Colores Sugerida
- **Primario**: Azul (#3B82F6) - Acciones principales
- **Éxito**: Verde (#10B981) - Estados activos, confirmados
- **Advertencia**: Amarillo (#F59E0B) - Pendientes
- **Error**: Rojo (#EF4444) - Cancelados, desactivar
- **Gris**: (#6B7280) - Texto secundario
- **Fondo**: Blanco/Gris claro (#F9FAFB)

### Estados de Citas (Badges)
- **PENDING**: Amarillo
- **CONFIRMED**: Azul
- **ATTENDED**: Verde
- **CANCELLED**: Rojo
- **NO_SHOW**: Gris oscuro

### Iconos Sugeridos (Lucide)
- Lista: `Users`
- Crear: `UserPlus`
- Editar: `Edit`
- Eliminar: `UserX`
- Ver detalle: `Eye`
- Búsqueda: `Search`
- Filtros: `Filter`
- Calendario: `Calendar`
- Teléfono: `Phone`
- Email: `Mail`
- Género masculino: `User`
- Género femenino: `User`
- Estadísticas: `BarChart3`
- Activo: `CheckCircle`
- Inactivo: `XCircle`

## Consideraciones Adicionales

### Responsive Design
- Desktop: Tabla completa con todas las columnas
- Tablet: Ocultar columnas menos importantes
- Mobile: Vista de cards en lugar de tabla

### Accesibilidad
- Labels en todos los inputs
- Mensajes de error claros
- Navegación por teclado
- Contraste adecuado de colores
- ARIA labels en botones de acción

### Performance
- Paginación en el frontend
- Debounce en búsqueda (300ms)
- Lazy loading de imágenes
- Optimistic updates con React Query
- Skeleton loaders durante carga

### Seguridad
- Validación en cliente y servidor
- Sanitización de inputs
- Confirmación para acciones destructivas
- No mostrar contraseñas en ningún momento

### Manejo de Errores
- Mostrar mensajes de error específicos
- Retry automático en fallos de red
- Fallback UI para errores
- Log de errores para debugging

## Ejemplo de Implementación: Página Principal

```tsx
// app/admin/patients/page.tsx
"use client";

import { useState } from "react";
import { usePatients } from "@/hooks/usePatients";
import { PatientTable } from "@/components/admin/patients/PatientTable";
import { PatientFilters } from "@/components/admin/patients/PatientFilters";
import { PatientStats } from "@/components/admin/patients/PatientStats";
import { CreatePatientModal } from "@/components/admin/patients/CreatePatientModal";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default function PatientsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: patients, isLoading, error } = usePatients();

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error al cargar pacientes</div>;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Pacientes</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Paciente
        </Button>
      </div>

      <PatientStats patients={patients} />
      <PatientFilters />
      <PatientTable patients={patients} />

      <CreatePatientModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
```

---

## Resumen

Este prompt proporciona toda la información necesaria para implementar una interfaz completa de administración de pacientes, incluyendo:

✅ Documentación completa de la API  
✅ Tipos TypeScript  
✅ Esquemas de validación  
✅ Funciones de API  
✅ Hooks de React Query  
✅ Estructura de componentes  
✅ Guías de diseño UI/UX  
✅ Consideraciones de accesibilidad y performance  

**Copia y pega este prompt completo en tu herramienta de IA favorita para generar la interfaz frontend.**
