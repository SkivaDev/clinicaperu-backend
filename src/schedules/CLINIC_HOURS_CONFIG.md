# Configuración de Horario de Clínica

## Descripción

Este sistema permite configurar el horario de atención de la clínica de manera centralizada. Los horarios de los doctores (`Schedule`) deben estar dentro de estos límites globales.

## Configuración Actual

### Valores por Defecto (en código)

- **Horario de atención:** 08:00 - 20:00
- **Días hábiles:** Lunes a Sábado (1-6)
- **Domingo:** Cerrado (0)

Estos valores están definidos en `src/schedules/schedule.config.ts`:

```typescript
CLINIC_OPEN_TIME: '08:00',
CLINIC_CLOSE_TIME: '20:00',
CLINIC_WORKING_DAYS: [1, 2, 3, 4, 5, 6],
```

## Sobrescribir con Variables de Entorno

Puedes modificar estos valores sin tocar código usando variables de entorno en tu archivo `.env`:

```bash
# Horario de atención (formato HH:mm)
CLINIC_OPEN_TIME=07:00
CLINIC_CLOSE_TIME=21:00

# Días hábiles (separados por comas, 0=Domingo, 1=Lunes, ..., 6=Sábado)
CLINIC_WORKING_DAYS=1,2,3,4,5,6,0  # Incluir domingo
```

### Validaciones

El sistema valida automáticamente:

- **Formato de hora:** Debe ser `HH:mm` (ej: `08:00`, `20:30`)
- **Días válidos:** Solo números entre 0-6
- **Coherencia:** Los horarios de doctores deben estar dentro del rango de la clínica

## Cómo Funciona

### Backend

1. **Configuración centralizada** (`schedule.config.ts`):
   - Define valores por defecto
   - Lee variables de entorno si existen
   - Valida formato y valores

2. **Validación en schedules** (`schedules.service.ts`):
   - Método `validateClinicHours(dayOfWeek, startTime, endTime)`
   - Se ejecuta en:
     - `create()` - Crear horario
     - `update()` - Actualizar horario
     - `updateSchedules()` - Actualización masiva

3. **Endpoint de configuración**:
   - `GET /admin/doctors/:doctorId/schedules/config`
   - Devuelve la configuración actual incluyendo horario de clínica

### Frontend

1. **Tipo `ScheduleConfig`** (`types/schedule-config.ts`):
   - Incluye `clinicOpenTime`, `clinicCloseTime`, `clinicWorkingDays`

2. **Hook `useScheduleConfig`**:
   - Consume el endpoint de configuración
   - Expone los valores al frontend

3. **Modal de creación de horarios** (`CreateScheduleModal.tsx`):
   - Limita inputs de hora con `min/max` según horario de clínica
   - Muestra mensaje informativo del rango permitido

4. **Calendario**:
   - Vista de agenda usa `minTime/maxTime` alineado con horario de clínica

## Errores Comunes

### Error: "El día seleccionado está fuera del horario de atención de la clínica"

**Causa:** Intentas crear un horario en un día no hábil (ej: domingo si está cerrado).

**Solución:** 
- Verifica `CLINIC_WORKING_DAYS` en tu configuración
- Asegúrate de que el día esté incluido en los días hábiles

### Error: "El horario debe estar dentro del horario de atención de la clínica (08:00 - 20:00)"

**Causa:** El horario del doctor excede el rango de la clínica.

**Solución:**
- Ajusta el horario del doctor para que esté dentro del rango
- O modifica `CLINIC_OPEN_TIME`/`CLINIC_CLOSE_TIME` si es necesario

## Roadmap Futuro

### Vista de Administrador (Próxima Implementación)

Se planea crear una interfaz de administración donde se pueda:

1. **Ver configuración actual** de horario de clínica
2. **Modificar horarios** de apertura/cierre
3. **Seleccionar días hábiles** con checkboxes
4. **Guardar cambios** que se reflejen inmediatamente

**Opciones de implementación:**

- **Opción A (Recomendada):** Guardar en base de datos
  - Crear tabla `ClinicSettings`
  - Modificar `getScheduleConfig()` para leer de BD primero
  - Permite configuración por clínica si hay múltiples sedes

- **Opción B:** Actualizar archivo `.env` programáticamente
  - Más simple pero requiere reinicio de servidor
  - Solo viable en entornos donde tengas acceso al filesystem

- **Opción C:** Configuración en servicio externo
  - Usar servicio de configuración (ej: AWS Parameter Store)
  - Más complejo pero escalable

## Ejemplos de Uso

### Ejemplo 1: Clínica con horario extendido

```bash
CLINIC_OPEN_TIME=07:00
CLINIC_CLOSE_TIME=22:00
CLINIC_WORKING_DAYS=1,2,3,4,5,6
```

### Ejemplo 2: Clínica que abre domingos

```bash
CLINIC_OPEN_TIME=08:00
CLINIC_CLOSE_TIME=20:00
CLINIC_WORKING_DAYS=0,1,2,3,4,5,6
```

### Ejemplo 3: Clínica con horario reducido sábados

**Limitación actual:** No se puede definir horario diferente por día.

**Workaround:** Usa el horario más amplio y los doctores ajustan sus horarios individuales.

```bash
CLINIC_OPEN_TIME=08:00
CLINIC_CLOSE_TIME=20:00  # Aunque sábado cierre a 14:00
CLINIC_WORKING_DAYS=1,2,3,4,5,6
```

Los doctores crearían horarios hasta 14:00 los sábados manualmente.

## Notas Técnicas

- Los cambios en variables de entorno requieren **reinicio del servidor**
- La configuración se lee una vez al iniciar la aplicación
- Las validaciones son **estrictas** para evitar inconsistencias
- El sistema usa formato 24 horas (00:00 - 23:59)
