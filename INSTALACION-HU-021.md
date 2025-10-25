# Instrucciones de Instalación - HU-021

## Paso 1: Instalar Dependencias

Ejecuta el siguiente comando para instalar @nestjs/schedule:

```bash
npm install @nestjs/schedule
```

## Paso 2: Verificar Instalación

Verifica que el paquete se haya instalado correctamente:

```bash
npm list @nestjs/schedule
```

## Paso 3: Resetear Base de Datos (Opcional)

Si deseas probar la generación de slots desde cero:

```bash
npx prisma migrate reset --force
```

Esto ejecutará el seed.ts que ahora genera automáticamente slots para los próximos 14 días.

## Paso 4: Iniciar el Servidor

```bash
npm run start:dev
```

## Paso 5: Probar el Endpoint

### Generar slots para los próximos 30 días (default):

```bash
curl -X POST http://localhost:3000/slots/admin/generate \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Generar slots para los próximos 60 días:

```bash
curl -X POST http://localhost:3000/slots/admin/generate \
  -H "Content-Type: application/json" \
  -d '{"daysAhead": 60}'
```

## Paso 6: Verificar Cron Jobs

Los cron jobs se ejecutarán automáticamente:
- **Diario a las 2:00 AM:** Genera slots para los próximos 7 días
- **Semanal (Domingos a las 3:00 AM):** Genera slots para los próximos 30 días

Puedes verificar los logs en la consola del servidor.

## Configuración Adicional

### Cambiar Zona Horaria

Edita `src/slots/slots-cron.service.ts` y cambia:

```typescript
timeZone: 'America/Lima'
```

### Deshabilitar Cron Jobs en Desarrollo

Si no quieres que los cron jobs se ejecuten en desarrollo, puedes comentar el `SlotsCronService` en `src/slots/slots.module.ts`.

## Verificación

### Verificar slots generados:

```bash
curl http://localhost:3000/slots?isActive=true
```

### Verificar estadísticas de un doctor:

```bash
curl http://localhost:3000/slots/statistics/doctor/{doctorId}
```

## Troubleshooting

### Error: Cannot find module '@nestjs/schedule'

Solución: Ejecuta `npm install @nestjs/schedule`

### Los cron jobs no se ejecutan

Verifica que:
1. El servidor esté corriendo
2. La zona horaria sea correcta
3. Los logs muestren el registro del cron job

### Performance lento

Si la generación de slots es lenta:
1. Verifica la cantidad de schedules activos
2. Reduce el número de días (daysAhead)
3. Revisa los logs para identificar errores
