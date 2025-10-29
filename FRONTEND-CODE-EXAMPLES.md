# 💻 Ejemplos de Código para Frontend

Ejemplos prácticos de cómo consumir la API desde el frontend.

---

## 🔧 Configuración Inicial

### API Client

```typescript
// lib/api-client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado - redirigir a login
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 📅 HU-020-UI: Schedules Management

### Hook: useSchedules

```typescript
// hooks/useSchedules.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

interface Schedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

interface CreateScheduleDto {
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export const useSchedules = (doctorId: string) => {
  return useQuery({
    queryKey: ['schedules', doctorId],
    queryFn: async () => {
      const { data } = await apiClient.get('/schedules', {
        params: { doctorId, isActive: true }
      });
      return data.data as Schedule[];
    },
    enabled: !!doctorId,
  });
};

export const useCreateSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (scheduleData: CreateScheduleDto) => {
      const { data } = await apiClient.post('/schedules', scheduleData);
      return data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.doctorId] });
      toast.success('Horario creado exitosamente');
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        if (error.response.data.error === 'SCHEDULE_OVERLAP') {
          toast.error('El horario se solapa con uno existente');
        }
      } else {
        toast.error('Error al crear horario');
      }
    },
  });
};

export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateScheduleDto> & { id: string }) => {
      const { data: response } = await apiClient.put(`/schedules/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Horario actualizado exitosamente');
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        if (error.response.data.error === 'SCHEDULE_HAS_SLOTS') {
          toast.error('No se puede editar: el horario tiene slots generados');
        }
      } else {
        toast.error('Error al actualizar horario');
      }
    },
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const { data } = await apiClient.delete(`/schedules/${scheduleId}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Horario desactivado exitosamente');
    },
    onError: () => {
      toast.error('Error al desactivar horario');
    },
  });
};
```

### Componente: CreateScheduleModal

```typescript
// components/schedules/CreateScheduleModal.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateSchedule } from '@/hooks/useSchedules';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const scheduleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  slotMinutes: z.enum(['15', '20', '30', '45', '60']),
}).refine((data) => data.startTime < data.endTime, {
  message: 'La hora de inicio debe ser menor que la hora de fin',
  path: ['endTime'],
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const SLOT_DURATIONS = [
  { value: '15', label: '15 minutos' },
  { value: '20', label: '20 minutos' },
  { value: '30', label: '30 minutos' },
  { value: '45', label: '45 minutos' },
  { value: '60', label: '60 minutos' },
];

interface CreateScheduleModalProps {
  open: boolean;
  onClose: () => void;
  doctorId: string;
}

export function CreateScheduleModal({ open, onClose, doctorId }: CreateScheduleModalProps) {
  const { mutate: createSchedule, isPending } = useCreateSchedule();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
  });

  const onSubmit = (data: ScheduleFormData) => {
    createSchedule({
      doctorId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      slotMinutes: parseInt(data.slotMinutes),
    }, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Horario</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Día de la semana */}
          <div className="space-y-2">
            <Label htmlFor="dayOfWeek">Día de la semana</Label>
            <Select
              onValueChange={(value) => setValue('dayOfWeek', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar día" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.dayOfWeek && (
              <p className="text-sm text-red-500">{errors.dayOfWeek.message}</p>
            )}
          </div>

          {/* Hora inicio */}
          <div className="space-y-2">
            <Label htmlFor="startTime">Hora de inicio</Label>
            <Input
              id="startTime"
              type="time"
              {...register('startTime')}
            />
            {errors.startTime && (
              <p className="text-sm text-red-500">{errors.startTime.message}</p>
            )}
          </div>

          {/* Hora fin */}
          <div className="space-y-2">
            <Label htmlFor="endTime">Hora de fin</Label>
            <Input
              id="endTime"
              type="time"
              {...register('endTime')}
            />
            {errors.endTime && (
              <p className="text-sm text-red-500">{errors.endTime.message}</p>
            )}
          </div>

          {/* Duración de slots */}
          <div className="space-y-2">
            <Label htmlFor="slotMinutes">Duración de slots</Label>
            <Select
              onValueChange={(value) => setValue('slotMinutes', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar duración" />
              </SelectTrigger>
              <SelectContent>
                {SLOT_DURATIONS.map((duration) => (
                  <SelectItem key={duration.value} value={duration.value}>
                    {duration.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.slotMinutes && (
              <p className="text-sm text-red-500">{errors.slotMinutes.message}</p>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creando...' : 'Crear Horario'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🚫 HU-020.5-UI: Doctor Unavailability

### Hook: useUnavailability

```typescript
// hooks/useUnavailability.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

interface Unavailability {
  id: string;
  startAt: string;
  endAt: string;
  reason?: string;
  doctorId: string;
}

interface CreateUnavailabilityDto {
  startAt: string;
  endAt: string;
  reason?: string;
}

export const useUnavailability = (doctorId: string) => {
  return useQuery({
    queryKey: ['unavailability', doctorId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/doctors/${doctorId}/unavailability`);
      return data.data as Unavailability[];
    },
    enabled: !!doctorId,
  });
};

export const useCreateUnavailability = (doctorId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (unavailabilityData: CreateUnavailabilityDto) => {
      const { data } = await apiClient.post(
        `/doctors/${doctorId}/unavailability`,
        unavailabilityData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unavailability', doctorId] });
      toast.success('Período de no disponibilidad creado');
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        toast.error('Existen citas confirmadas en este período');
      } else {
        toast.error('Error al crear período');
      }
    },
  });
};

export const useDeleteUnavailability = (doctorId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (unavailabilityId: string) => {
      await apiClient.delete(`/doctors/${doctorId}/unavailability/${unavailabilityId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unavailability', doctorId] });
      toast.success('Período eliminado exitosamente');
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        toast.error('No se puede eliminar: existen citas confirmadas');
      } else {
        toast.error('Error al eliminar período');
      }
    },
  });
};
```

---

## 👨‍⚕️ HU-024-UI: Doctor Book Appointment

### Hook: usePatientSearch

```typescript
// hooks/usePatientSearch.ts
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { debounce } from 'lodash';

interface Patient {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profileImage?: string;
  role: string;
  isActive: boolean;
}

export const usePatientSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce para evitar muchas peticiones
  const debouncedSetQuery = useCallback(
    debounce((query: string) => {
      setDebouncedQuery(query);
    }, 300),
    []
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    debouncedSetQuery(query);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['patients', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 3) return [];
      
      const { data } = await apiClient.get('/users/search', {
        params: {
          q: debouncedQuery,
          role: 'PATIENT',
          limit: 10,
        },
      });
      return data.data as Patient[];
    },
    enabled: debouncedQuery.length >= 3,
  });

  return {
    searchQuery,
    handleSearch,
    patients: data || [],
    isLoading,
    error,
  };
};
```

### Componente: PatientSearch

```typescript
// components/appointments/PatientSearch.tsx
'use client';

import { useState } from 'react';
import { Search, User } from 'lucide-react';
import { usePatientSearch } from '@/hooks/usePatientSearch';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PatientSearchProps {
  onSelectPatient: (patient: any) => void;
  selectedPatient?: any;
}

export function PatientSearch({ onSelectPatient, selectedPatient }: PatientSearchProps) {
  const { searchQuery, handleSearch, patients, isLoading } = usePatientSearch();
  const [showResults, setShowResults] = useState(false);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por DNI, nombre o email..."
          value={searchQuery}
          onChange={(e) => {
            handleSearch(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="pl-10"
        />
        
        {/* Resultados de búsqueda */}
        {showResults && searchQuery.length >= 3 && (
          <Card className="absolute z-10 w-full mt-2 max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Buscando...
              </div>
            ) : patients.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No se encontraron pacientes
              </div>
            ) : (
              <div className="divide-y">
                {patients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => {
                      onSelectPatient(patient);
                      setShowResults(false);
                    }}
                    className="w-full p-3 hover:bg-accent transition-colors text-left flex items-center gap-3"
                  >
                    <Avatar>
                      <AvatarImage src={patient.profileImage} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        DNI: {patient.dni} • {patient.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Paciente seleccionado */}
      {selectedPatient && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={selectedPatient.profileImage} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">
                {selectedPatient.firstName} {selectedPatient.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                DNI: {selectedPatient.dni}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
```

### Hook: useDoctorBooking

```typescript
// hooks/useDoctorBooking.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

interface DoctorBookAppointmentDto {
  slotId: string;
  patientId: string;
  reason: string;
  notes?: string;
}

export const useDoctorBookAppointment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookingData: DoctorBookAppointmentDto) => {
      const { data } = await apiClient.post(
        '/appointments/doctor/appointments',
        bookingData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      toast.success('Cita reservada exitosamente');
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        toast.error('El slot ya está reservado');
      } else if (error.response?.status === 403) {
        toast.error('El slot no pertenece a tu agenda');
      } else {
        toast.error('Error al reservar cita');
      }
    },
  });
};
```

---

## 🎨 Utilidades

### Formato de Fechas

```typescript
// lib/date-utils.ts
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const formatDate = (date: string | Date) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: es });
};

export const formatTime = (time: string) => {
  return time; // Ya viene en formato "HH:mm"
};

export const formatDateTime = (date: string | Date) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, "dd/MM/yyyy 'a las' HH:mm", { locale: es });
};

export const getDayName = (dayOfWeek: number) => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayOfWeek];
};
```

### Manejo de Errores

```typescript
// lib/error-handler.ts
import { toast } from 'sonner';

export const handleApiError = (error: any) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        toast.error(data.message || 'Datos inválidos');
        break;
      case 401:
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente');
        break;
      case 403:
        toast.error('No tienes permisos para realizar esta acción');
        break;
      case 404:
        toast.error('Recurso no encontrado');
        break;
      case 409:
        // Manejar conflictos específicos
        if (data.error === 'SCHEDULE_OVERLAP') {
          toast.error('El horario se solapa con uno existente');
        } else if (data.error === 'CONFIRMED_APPOINTMENTS_EXIST') {
          toast.error('Existen citas confirmadas en este período');
        } else {
          toast.error(data.message || 'Conflicto al procesar la solicitud');
        }
        break;
      case 500:
        toast.error('Error del servidor. Por favor, intenta más tarde');
        break;
      default:
        toast.error('Error inesperado');
    }
  } else if (error.request) {
    toast.error('No se pudo conectar con el servidor');
  } else {
    toast.error('Error al procesar la solicitud');
  }
};
```

---

## 📝 Notas Importantes

1. **Debounce en búsqueda:** Siempre implementar debounce (300ms) para evitar múltiples peticiones
2. **Mínimo de caracteres:** Requerir al menos 3 caracteres antes de buscar
3. **Manejo de errores 409:** Mostrar mensajes específicos según el tipo de conflicto
4. **Invalidación de queries:** Siempre invalidar queries relacionadas después de mutaciones
5. **Loading states:** Mostrar estados de carga en todas las operaciones asíncronas

---

**Última actualización:** 28 de Octubre, 2025
