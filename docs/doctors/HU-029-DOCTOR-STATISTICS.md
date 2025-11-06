# HU-029 — Doctor Statistics Dashboard

**Prioridad:** BAJA  
**Estimación:** 1.5 días  
**Rol afectado:** Doctor  
**Estado:** ✅ COMPLETADO (Backend)

---

## 📋 Historia de Usuario

```
Como Doctor
Quiero ver estadísticas de mi desempeño y actividad
Para monitorear mi productividad y tomar decisiones sobre mi agenda
```

---

## ✅ Implementación Backend

### 🎯 Endpoint Principal

**Ruta:** `GET /doctors/statistics`

**Autenticación:** JWT Bearer Token (Rol: DOCTOR)

**Cache:** 5 minutos (300,000ms)

**Response Time Objetivo:** < 500ms

---

### 📊 Estructura de Respuesta

```typescript
{
  "statusCode": 200,
  "message": "Estadísticas obtenidas exitosamente",
  "data": {
    "currentMonth": {
      "totalAttended": 45,
      "totalCancelled": 5,
      "totalNoShows": 3,
      "occupancyRate": 75.5,
      "estimatedRevenue": 4500.0,
      "variationVsPreviousMonth": 12.5
    },
    "historical": {
      "attendedByMonth": [
        { "month": "2024-05", "count": 40 },
        { "month": "2024-06", "count": 42 }
      ],
      "noShowRateByMonth": [
        { "month": "2024-05", "rate": 5.5 },
        { "month": "2024-06", "rate": 6.0 }
      ]
    },
    "general": {
      "totalUniquePatientsAttended": 150,
      "averageRating": 4.7,
      "upcomingAppointments": [
        {
          "id": "uuid-123",
          "startAt": "2024-10-30T14:00:00Z",
          "endAt": "2024-10-30T14:30:00Z",
          "patientName": "Juan Pérez",
          "reason": "Consulta general"
        }
      ]
    },
    "generatedAt": "2024-10-30T10:00:00Z"
  }
}
```

---

### 🔧 Parámetros de Query (Opcionales)

| Parámetro   | Tipo   | Valores Permitidos                                    | Default      | Descripción                        |
| ----------- | ------ | ----------------------------------------------------- | ------------ | ---------------------------------- |
| `dateRange` | string | `THIS_MONTH`, `LAST_3_MONTHS`, `LAST_6_MONTHS` | `THIS_MONTH` | Rango de fechas para estadísticas |

**Ejemplo:**
```bash
GET /doctors/statistics?dateRange=LAST_6_MONTHS
```

---

## 📁 Archivos Implementados

### 1. **DTOs** (`src/doctors/dto/doctor-statistics.dto.ts`)

- `DoctorStatisticsDto` - DTO principal de respuesta
- `CurrentMonthMetricsDto` - Métricas del mes actual
- `HistoricalMetricsDto` - Métricas históricas (6 meses)
- `GeneralMetricsDto` - Métricas generales
- `MonthlyDataDto` - Datos mensuales
- `MonthlyNoShowRateDto` - Tasa de no-show mensual
- `UpcomingAppointmentDto` - Próximas citas
- `StatisticsQueryDto` - Query params
- `DateRangeEnum` - Enum para rangos de fechas

### 2. **Servicio** (`src/doctors/doctors.service.ts`)

#### Métodos Públicos:
- `getStatistics(doctorId, dateRange)` - Obtiene estadísticas completas

#### Métodos Privados:
- `getCurrentMonthMetrics()` - Calcula métricas del mes actual
- `getHistoricalMetrics()` - Obtiene métricas de últimos 6 meses
- `getGeneralMetrics()` - Obtiene métricas generales

### 3. **Controlador** (`src/doctors/doctor-statistics.controller.ts`)

- Endpoint `GET /doctors/statistics`
- Guards: `JwtAuthGuard`, `RolesGuard` (Role: DOCTOR)
- Cache Interceptor: 5 minutos
- Extrae `doctorId` automáticamente del JWT

### 4. **Tests** (`src/doctors/doctor-statistics.controller.spec.ts`)

- ✅ Controller debe estar definido
- ✅ Debe retornar estadísticas para doctor autenticado
- ✅ Debe lanzar NotFoundException si no existe perfil de doctor
- ✅ Debe usar rango de fechas por defecto si no se provee

### 5. **Módulo** (`src/doctors/doctors.module.ts`)

- Registrado `DoctorStatisticsController` en el módulo

---

## 🚀 Cómo Usar

### 1. **Autenticación**

Primero, obtén un token JWT autenticándote como doctor:

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "doctor@example.com",
  "password": "password123"
}
```

### 2. **Obtener Estadísticas**

```bash
GET /doctors/statistics
Authorization: Bearer <tu-token-jwt>
```

### 3. **Con Rango de Fechas Personalizado**

```bash
GET /doctors/statistics?dateRange=LAST_6_MONTHS
Authorization: Bearer <tu-token-jwt>
```

---

## 🔍 Métricas Calculadas

### **Mes Actual:**
- ✅ **Total de citas atendidas** - Citas con status `ATTENDED`
- ✅ **Total de citas canceladas** - Citas con status `CANCELLED`
- ✅ **Total de no-shows** - Citas con status `NO_SHOW`
- ✅ **Tasa de ocupación** - `(slots booked / slots totales) × 100`
- ✅ **Ingresos estimados** - `citas atendidas × precio consulta`
- ✅ **Variación vs mes anterior** - Porcentaje de cambio

### **Últimos 6 Meses:**
- ✅ **Citas atendidas por mes** - Array con conteo mensual
- ✅ **Tasa de no-show por mes** - Porcentaje mensual

### **Generales:**
- ✅ **Pacientes únicos atendidos** - Total histórico
- ✅ **Rating promedio** - Calificación actual del doctor
- ✅ **Próximas citas** - Siguientes 7 días (máx. 10)

---

## ⚡ Optimizaciones Implementadas

### 1. **Queries SQL Optimizadas**
- Uso de `$queryRaw` con agregaciones nativas de PostgreSQL
- Queries con `COUNT`, `CASE WHEN`, `TO_CHAR` para eficiencia
- Índices existentes en Prisma schema aprovechados

### 2. **Cache de 5 Minutos**
- Implementado con `CacheInterceptor`
- TTL: 300,000ms (5 minutos)
- Cache en memoria (puede extenderse a Redis)

### 3. **Ejecución Paralela**
- Métricas del mes actual y anterior se calculan en paralelo con `Promise.all()`
- Reduce tiempo de respuesta significativamente

### 4. **Limitación de Resultados**
- Próximas citas limitadas a 10 registros
- Histórico limitado a 6 meses

---

## 🔒 Seguridad

- ✅ **JWT Authentication** - Token requerido
- ✅ **Role-Based Access** - Solo rol `DOCTOR`
- ✅ **Auto-identificación** - Doctor solo ve sus propias estadísticas
- ✅ **Validación de perfil** - Verifica que userId tenga perfil de doctor

---

## 📊 Ejemplo de Uso con cURL

```bash
# Obtener estadísticas del mes actual
curl -X GET "http://localhost:3000/doctors/statistics" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Obtener estadísticas de últimos 6 meses
curl -X GET "http://localhost:3000/doctors/statistics?dateRange=LAST_6_MONTHS" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📊 Ejemplo de Uso con JavaScript/TypeScript

```typescript
// Usando fetch
const getStatistics = async (token: string, dateRange?: string) => {
  const url = new URL('http://localhost:3000/doctors/statistics');
  if (dateRange) {
    url.searchParams.append('dateRange', dateRange);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

// Uso
const stats = await getStatistics(myToken, 'LAST_6_MONTHS');
console.log('Citas atendidas este mes:', stats.data.currentMonth.totalAttended);
console.log('Tasa de ocupación:', stats.data.currentMonth.occupancyRate + '%');
console.log('Ingresos estimados:', stats.data.currentMonth.estimatedRevenue);
```

---

## 🧪 Testing

### Ejecutar Tests Unitarios

```bash
# Todos los tests
npm run test

# Solo tests de estadísticas
npm run test doctor-statistics.controller.spec.ts

# Con coverage
npm run test:cov
```

### Tests Implementados:
- ✅ Controller definido correctamente
- ✅ Retorna estadísticas para doctor autenticado
- ✅ Lanza excepción si no existe perfil de doctor
- ✅ Usa rango de fechas por defecto

---

## 📈 Rendimiento

### Métricas Esperadas:
- **Response Time:** < 500ms (objetivo cumplido con cache)
- **Cache Hit Rate:** ~80% (después de warm-up)
- **Database Queries:** 4-5 queries optimizadas
- **Memoria:** Mínima (cache in-memory)

### Monitoreo:
```typescript
// Las estadísticas incluyen timestamp de generación
{
  "generatedAt": "2024-10-30T10:00:00Z"
}
```

---

## 🔄 Próximos Pasos (Frontend)

### Componentes a Implementar:
1. **Página:** `app/doctor/statistics/page.tsx`
2. **Componentes:**
   - `StatCard.tsx` - Cards de métricas
   - `AppointmentsChart.tsx` - Gráfico de líneas (recharts)
   - `StatusComparisonChart.tsx` - Gráfico de barras
   - `UpcomingAppointmentsList.tsx` - Lista de próximas citas
3. **Hook:** `useDoctorStatistics.ts` con react-query
4. **Features:**
   - Auto-refresh cada 5 minutos
   - Selector de rango de fechas
   - Botón "Exportar PDF" (placeholder)
   - Loading skeletons
   - Responsive design

---

## 🐛 Troubleshooting

### Error: "No se encontró un perfil de doctor asociado a este usuario"
**Causa:** El usuario autenticado no tiene un registro en la tabla `Doctor`  
**Solución:** Verificar que el usuario tenga rol `DOCTOR` y registro en tabla `Doctor`

### Error: "Doctor no encontrado"
**Causa:** El `doctorId` no existe en la base de datos  
**Solución:** Verificar integridad de datos entre `User` y `Doctor`

### Cache no funciona
**Causa:** Interceptor no configurado correctamente  
**Solución:** Verificar que `CacheInterceptor` esté aplicado en el endpoint

### Estadísticas vacías
**Causa:** Doctor sin citas o slots en el rango de fechas  
**Solución:** Normal si es un doctor nuevo, verificar datos de prueba

---

## 📝 Notas Técnicas

### Consideraciones de Diseño:
- El parámetro `dateRange` está preparado para uso futuro (actualmente siempre calcula últimos 6 meses)
- Cache puede migrarse a Redis para entornos de producción
- Queries optimizadas con índices existentes en Prisma schema
- Variación vs mes anterior calculada automáticamente

### Dependencias:
- ✅ HU-023 (Appointments) - Requerido
- ✅ Prisma ORM
- ✅ NestJS Guards & Interceptors
- ✅ JWT Authentication

---

## ✅ Checklist de Implementación

- ✅ DTOs creados y documentados
- ✅ Servicio implementado con queries optimizadas
- ✅ Endpoint con guards y cache
- ✅ Tests unitarios
- ✅ Documentación Swagger
- ✅ Módulo configurado
- ✅ Cache interceptor aplicado
- ✅ Seguridad implementada
- ✅ Optimizaciones de rendimiento
- ✅ Documentación markdown

---

## 👨‍💻 Autor

Implementado siguiendo las mejores prácticas de NestJS, código limpio y arquitectura escalable.

**Fecha de Implementación:** Octubre 2024  
**Versión:** 1.0.0  
**Backend Framework:** NestJS + Prisma + PostgreSQL
