# Guía de Desactivación Lógica de Horarios y Slots

## 🎯 Objetivo

Esta guía explica cómo implementar correctamente la desactivación lógica de horarios (`Schedule`) y slots en el sistema de reservas médicas, garantizando que **no se eliminen registros** y se mantenga la **consistencia de datos históricos**.

## 📋 Reglas de Negocio Implementadas

### ✅ **Schedule (Horarios)**
- **Campo**: `isActive: Boolean @default(true)`
- **Comportamiento**: Solo se actualiza a `false`, nunca se elimina
- **Filtros**: Solo horarios activos se muestran en el frontend

### ✅ **Slot (Espacios de Tiempo)**
- **Campo**: `isActive: Boolean @default(true)`
- **Comportamiento**: Solo slots futuros libres se desactivan
- **Filtros**: Solo slots activos y libres son agendables

## 🔧 Implementación Técnica

### 1. **Desactivación de Horarios**

```typescript
// Desactivar un horario específico
const result = await schedulesService.deactivateSchedule(doctorId, scheduleId);

// Resultado:
{
  scheduleDeactivated: boolean;
  slotsDeactivated: number;    // Slots futuros libres desactivados
  slotsPreserved: number;      // Slots con citas preservados
  errors: string[];
}
```

### 2. **Reactivación de Horarios**

```typescript
// Reactivar un horario
const result = await schedulesService.reactivateSchedule(doctorId, scheduleId);

// Resultado:
{
  scheduleReactivated: boolean;
  slotsReactivated: number;   // Slots existentes reactivados
  slotsGenerated: number;     // Nuevos slots generados
  errors: string[];
}
```

### 3. **Filtrado de Slots Disponibles**

```typescript
// Solo slots agendables (activos y libres)
const availableSlots = await slotsService.getAvailableSlots({
  doctorId: 'doctor-id',
  startDate: new Date(),
  isActive: true,    // Solo activos
  status: 'FREE'     // Solo libres
});
```

## 📊 Casos de Uso

### **Caso 1: Crear Nuevo Horario**
```typescript
// ✅ Horario se crea como activo
const newSchedule = {
  dayOfWeek: 1,
  startTime: '08:00',
  endTime: '14:00',
  slotMinutes: 30,
  isActive: true  // ← Activo por defecto
};

// ✅ Se generan slots activos automáticamente
```

### **Caso 2: Desactivar Horario Existente**
```typescript
// ✅ Horario se marca como inactivo
await schedulesService.deactivateSchedule(doctorId, scheduleId);

// ✅ Slots futuros libres se desactivan
// ✅ Slots con citas se preservan
// ✅ Historial se mantiene intacto
```

### **Caso 3: Cita Reservada**
```typescript
// ✅ Slot mantiene su estado
{
  id: 'slot-123',
  status: 'BOOKED',    // ← Mantiene estado
  isActive: true,      // ← Mantiene activo
  appointment: { ... } // ← Cita preservada
}
```

### **Caso 4: Cancelar Cita**
```typescript
// ✅ Si horario está activo → slot vuelve a FREE
// ✅ Si horario está inactivo → slot queda FREE pero inactivo
```

## 🚀 API Endpoints

### **Horarios**

#### Obtener Horarios Activos (Frontend)
```http
GET /admin/doctors/:doctorId/schedules
```
- **Respuesta**: Solo horarios con `isActive: true`
- **Uso**: Mostrar horarios disponibles para agendar

#### Obtener Todos los Horarios (Admin)
```http
GET /admin/doctors/:doctorId/schedules/all
```
- **Respuesta**: Todos los horarios (activos e inactivos)
- **Uso**: Administración y auditoría

#### Obtener Horarios Inactivos
```http
GET /admin/doctors/:doctorId/schedules/inactive
```
- **Respuesta**: Solo horarios con `isActive: false`
- **Uso**: Reactivación de horarios

#### Desactivar Horario
```http
DELETE /admin/doctors/:doctorId/schedules/:scheduleId
```
- **Acción**: Marca horario como inactivo
- **Efecto**: Desactiva slots futuros libres

#### Reactivar Horario
```http
POST /admin/doctors/:doctorId/schedules/:scheduleId/reactivate
```
- **Acción**: Marca horario como activo
- **Efecto**: Reactiva slots existentes + genera nuevos

### **Slots**

#### Obtener Slots Disponibles
```http
GET /slots?doctorId=:doctorId&isActive=true&status=FREE
```
- **Filtros**: Solo slots activos y libres
- **Uso**: Mostrar disponibilidad para agendar

#### Verificar Disponibilidad de Slot
```http
GET /slots/:slotId/check-availability
```
- **Validación**: `status === 'FREE' && isActive === true`
- **Uso**: Validar antes de agendar

#### Estadísticas de Slots
```http
GET /slots/statistics/doctor/:doctorId
```
- **Métricas**: Totales, activos, inactivos, por estado
- **Uso**: Dashboard y reportes

## 🔄 Flujo de Desactivación

### **Paso a Paso**

1. **Validación**
   ```typescript
   // ✅ Verificar que el horario existe
   // ✅ Verificar que pertenece al doctor
   // ✅ Verificar que está activo
   ```

2. **Desactivación del Horario**
   ```typescript
   await tx.schedule.update({
     where: { id: scheduleId },
     data: { isActive: false }
   });
   ```

3. **Desactivación de Slots Futuros**
   ```typescript
   await tx.slot.updateMany({
     where: {
       scheduleId,
       startAt: { gte: new Date() },
       status: 'FREE',
       isActive: true
     },
     data: { isActive: false }
   });
   ```

4. **Preservación de Datos Históricos**
   ```typescript
   // ✅ Slots con citas se mantienen activos
   // ✅ Citas existentes no se afectan
   // ✅ Historial completo se preserva
   ```

## 🎨 Frontend - Recomendaciones

### **Mostrar Slots Disponibles**
```typescript
// ✅ Solo mostrar slots activos y libres
const availableSlots = slots.filter(slot => 
  slot.isActive === true && 
  slot.status === 'FREE'
);
```

### **Mostrar Slots Inactivos (Opcional)**
```typescript
// ✅ Mostrar con opacidad para contexto histórico
const inactiveSlots = slots.filter(slot => 
  slot.isActive === false
);

// CSS: opacity: 0.5; color: gray;
```

### **Validación de Agendamiento**
```typescript
// ✅ Validar antes de permitir agendar
const canBook = await slotsService.canBookSlot(slotId);

if (!canBook) {
  showError('Este slot no está disponible para agendar');
  return;
}
```

## 🧪 Testing

### **Casos de Prueba**

#### 1. **Desactivación Básica**
```typescript
it('should deactivate schedule and future free slots', async () => {
  const result = await schedulesService.deactivateSchedule(doctorId, scheduleId);
  
  expect(result.scheduleDeactivated).toBe(true);
  expect(result.slotsDeactivated).toBeGreaterThan(0);
  expect(result.slotsPreserved).toBe(0); // No hay citas
});
```

#### 2. **Preservación de Citas**
```typescript
it('should preserve booked slots when deactivating', async () => {
  // Crear cita primero
  await createAppointment(slotId);
  
  const result = await schedulesService.deactivateSchedule(doctorId, scheduleId);
  
  expect(result.slotsPreserved).toBeGreaterThan(0);
  
  // Verificar que la cita sigue existiendo
  const appointment = await getAppointment(slotId);
  expect(appointment).toBeDefined();
});
```

#### 3. **Filtrado de Slots**
```typescript
it('should only return active and free slots', async () => {
  const slots = await slotsService.getAvailableSlots({
    doctorId,
    isActive: true,
    status: 'FREE'
  });
  
  slots.forEach(slot => {
    expect(slot.isActive).toBe(true);
    expect(slot.status).toBe('FREE');
  });
});
```

## 📈 Monitoreo y Métricas

### **Estadísticas Disponibles**

```typescript
const stats = await schedulesService.getScheduleStatistics(doctorId);

console.log(`
  Horarios Activos: ${stats.activeSchedules}
  Horarios Inactivos: ${stats.inactiveSchedules}
  Slots Libres: ${stats.freeSlots}
  Slots Reservados: ${stats.bookedSlots}
`);
```

### **Alertas Recomendadas**

- **Slots inactivos**: Monitorear si hay muchos slots inactivos
- **Horarios sin slots**: Alertar si un horario activo no tiene slots
- **Citas en slots inactivos**: Verificar integridad de datos

## 🔒 Consideraciones de Seguridad

### **Validaciones Implementadas**

1. **Autorización**: Solo el doctor propietario puede desactivar sus horarios
2. **Integridad**: Las transacciones garantizan consistencia
3. **Auditoría**: Todos los cambios quedan registrados
4. **Rollback**: Errores revierten todos los cambios

### **Buenas Prácticas**

- ✅ **Siempre usar transacciones** para operaciones críticas
- ✅ **Validar permisos** antes de desactivar
- ✅ **Notificar al usuario** sobre slots afectados
- ✅ **Mantener logs** de todas las operaciones

## 🚨 Troubleshooting

### **Problemas Comunes**

#### **Slots no se desactivan**
- Verificar que el horario pertenece al doctor
- Verificar que el horario está activo
- Revisar logs de errores

#### **Citas desaparecen**
- Verificar que solo se desactivan slots futuros libres
- Revisar que las citas existentes se preservan
- Verificar integridad de la base de datos

#### **Performance lenta**
- Verificar índices en `isActive` y `status`
- Considerar paginación para grandes volúmenes
- Optimizar consultas con filtros apropiados

## 📚 Referencias

- **Modelo Prisma**: `src/prisma/schema.prisma`
- **Servicio Principal**: `src/schedules/schedules.service.ts`
- **Servicio de Slots**: `src/slots/slots.service.ts`
- **Controladores**: `src/schedules/schedules.controller.ts`
- **Tests**: `src/schedules/schedules.service.spec.ts`

---

*Última actualización: Enero 2024*
*Versión: Sprint 3 - Desactivación Lógica*
