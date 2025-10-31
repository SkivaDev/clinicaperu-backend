# HU-025b — Calendar UI (Patient Availability & Booking)
## 📘 Guía de Integración Frontend

**Estado Backend:** ✅ COMPLETADO  
**Endpoints:** ✅ TODOS DISPONIBLES

---

## ✅ Endpoints Disponibles

### 1. Obtener Slots Disponibles
```
GET /calendar/events?doctorId=xxx&start=2024-10-30T00:00:00Z&end=2024-11-06T23:59:59Z&status=FREE
Authorization: Bearer <token>
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "slots": [
      {
        "id": "slot-uuid-123",
        "doctorId": "doctor-uuid-123",
        "startAt": "2024-10-30T14:00:00Z",
        "endAt": "2024-10-30T14:30:00Z",
        "status": "FREE"
      }
    ]
  }
}
```

### 2. Info del Doctor
```
GET /public/doctors/:id
```

### 3. Reservar Cita
```
POST /appointments
Authorization: Bearer <token>

{
  "slotId": "slot-uuid-123",
  "reason": "Consulta general (min 10 chars)",
  "notes": "Opcional (max 1000 chars)"
}
```

**Errores:**
- `409`: Slot ya reservado
- `400`: Validación fallida
- `500`: Error del servidor

---

## 🔧 Implementación

### Hook: useCalendar.ts
```typescript
export function useCalendar(params) {
  const bookAppointment = useMutation({
    mutationFn: async (booking) => {
      return api.post('/appointments', booking);
    },
    onMutate: async (booking) => {
      // Optimistic update: remover slot
      const previous = queryClient.getQueryData(['calendar']);
      queryClient.setQueryData(['calendar'], {
        ...previous,
        slots: previous.slots.filter(s => s.id !== booking.slotId)
      });
      return { previous };
    },
    onError: (err, vars, context) => {
      // Revertir en caso de error
      queryClient.setQueryData(['calendar'], context.previous);
    }
  });
}
```

### Validación Zod
```typescript
export const bookingSchema = z.object({
  slotId: z.string().min(1),
  reason: z.string().min(10).max(500),
  notes: z.string().max(1000).optional()
});
```

---

## 📋 Checklist

### Backend ✅
- ✅ GET /calendar/events (filtro por doctor)
- ✅ GET /public/doctors/:id
- ✅ POST /appointments (atomic booking)
- ✅ Validaciones (reason 10-500 chars)
- ✅ Manejo de concurrencia (409)
- ✅ Rate limit (10 req/min)

### Frontend ⏳
- ⏳ Hook useCalendar con optimistic updates
- ⏳ BookingModal con formulario
- ⏳ Página /patient/availability
- ⏳ Manejo de errores con toast
- ⏳ Responsive design

---

## 🚀 Flujo
1. Usuario ve slots FREE (verdes)
2. Click en slot → abre modal
3. Modal muestra: doctor info + fecha + formulario
4. Submit → POST /appointments
5. Optimistic update (slot desaparece)
6. Si éxito: toast + redirect a /patient/appointments
7. Si error: revertir + mostrar mensaje

Ver documentación completa en Swagger: `/api/docs`
