# Patients Module

Módulo para gestionar funcionalidades relacionadas con pacientes en el sistema ClinicaPeru.

## Endpoints Disponibles

### GET /patients/my-doctors

Obtiene la lista de doctores que han atendido al paciente autenticado.

**Autenticación:** JWT Bearer Token (rol PATIENT requerido)

**Response:**
```typescript
{
  statusCode: 200,
  message: "Found X doctor(s)",
  data: MyDoctorDto[]
}
```

## Estructura del Módulo

```
patients/
├── patients.module.ts          # Configuración del módulo
├── patients.controller.ts      # Endpoints REST
├── patients.service.ts         # Lógica de negocio
├── dto/
│   └── my-doctor.dto.ts       # DTOs de respuesta
└── README.md                   # Este archivo
```

## Uso desde Frontend

### Ejemplo con Axios

```typescript
import axios from 'axios';

const getMyDoctors = async (token: string) => {
  const response = await axios.get('/patients/my-doctors', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data.data;
};
```

### Ejemplo con React Query

```typescript
import { useQuery } from '@tanstack/react-query';

export const useMyDoctors = () => {
  return useQuery({
    queryKey: ['my-doctors'],
    queryFn: async () => {
      const response = await fetch('/patients/my-doctors', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      return data.data;
    }
  });
};
```

## Notas de Implementación

- Query optimizada con una sola consulta SQL
- Filtrado en base de datos (no en aplicación)
- Solo doctores activos con citas confirmadas/atendidas
- Ordenado por fecha de última cita (más reciente primero)
- Performance target: < 300ms

## Documentación Completa

Ver [HU-027-PATIENT-MY-DOCTORS.md](../../HU-027-PATIENT-MY-DOCTORS.md) para documentación detallada.
