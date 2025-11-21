# 📊 Seed de Datos para Reportes

Este documento explica cómo agregar datos históricos adicionales para que los reportes del sistema muestren información completa y realista.

## 🎯 Propósito

El script `seed-reports-data.ts` genera datos históricos de los últimos **6 meses** para:

- ✅ **Citas médicas** con diferentes estados (ATTENDED, CANCELLED, CONFIRMED, PENDING, NO_SHOW)
- ✅ **Pagos** completados y pendientes con diferentes métodos
- ✅ **Expedientes médicos** con diagnósticos variados
- ✅ **Pacientes nuevos** para métricas de crecimiento
- ✅ **Ratings actualizados** de doctores basados en actividad

## 📋 Prerequisitos

1. Haber ejecutado el seed principal primero:
   ```bash
   npx prisma migrate reset --force
   # o
   npx prisma db seed
   ```

2. Tener la base de datos corriendo (PostgreSQL)

## 🚀 Cómo Ejecutar

### Opción 1: Usando el script npm (Recomendado)

```bash
pnpm run seed:reports
```

### Opción 2: Directamente con ts-node

```bash
npx ts-node prisma/seed-reports-data.ts
```

## 📊 Datos Generados

El script genera aproximadamente:

- **~540 citas** distribuidas en los últimos 6 meses (3 citas/día promedio)
- **~400 pagos** (70% completados, 30% pendientes)
- **~350 expedientes médicos** para citas atendidas
- **20 pacientes adicionales** (15 con citas recientes = pacientes nuevos)
- **Ratings actualizados** para todos los doctores

### Distribución de Estados de Citas

- **60%** ATTENDED (atendidas)
- **20%** CONFIRMED (confirmadas - futuras)
- **10%** CANCELLED (canceladas)
- **5%** PENDING (pendientes)
- **5%** NO_SHOW (no asistieron)

### Métodos de Pago

- **50%** Tarjeta simulada (SIMULATED_CARD)
- **50%** Efectivo en clínica (CASH_AT_CLINIC)

### Tipos de Consulta

- **60%** Consultas regulares (CONSULTATION)
- **20%** Seguimientos (FOLLOW_UP)
- **20%** Emergencias (EMERGENCY)

## 🎨 Impacto en Reportes

Después de ejecutar este seed, los reportes mostrarán:

### KPIs
- ✅ Ingresos totales realistas (~S/. 50,000 - 80,000)
- ✅ Total de citas (~550+)
- ✅ Tasa de ocupación (~60-70%)
- ✅ Pacientes nuevos (~15 en últimos 30 días)
- ✅ Tiempo de espera promedio
- ✅ Tasa de cancelación (~10%)
- ✅ Tasa de retención
- ✅ Pacientes activos

### Gráficos
- ✅ **Revenue Chart**: Ingresos mensuales de los últimos 6 meses
- ✅ **Appointment Stats**: Distribución real de estados de citas
- ✅ **Top Doctors**: Doctores ordenados por pacientes atendidos
- ✅ **Recent Activity**: Actividades recientes del sistema

### Analíticas
- ✅ **Operacional**: Heatmap de horarios, funnel de conversión, tendencias
- ✅ **Financiero**: Métodos de pago, ingresos por especialidad, proyecciones
- ✅ **Médico**: Diagnósticos frecuentes, tipos de consulta, citas por especialidad

## 🔄 Ejecutar Múltiples Veces

⚠️ **ADVERTENCIA**: Cada ejecución agregará MÁS datos. Si quieres empezar de cero:

```bash
# Resetear base de datos y ejecutar seed principal
npx prisma migrate reset --force

# Luego ejecutar seed de reportes
pnpm run seed:reports
```

## 📈 Estadísticas Finales

Al finalizar, el script mostrará un resumen como:

```
📊 ESTADÍSTICAS FINALES DEL SISTEMA:
=====================================
👥 Total Pacientes: 28
👨‍⚕️ Total Doctores: 11
📅 Total Citas: 565
   - Atendidas: 350
   - Confirmadas: 120
   - Canceladas: 55
   - Pendientes: 25
   - No Show: 15
💳 Total Pagos: 470
   - Completados: 400
   - Pendientes: 70
📋 Total Expedientes Médicos: 350
=====================================

💰 Ingresos Totales: S/. 65,450.00
📊 Tasa de Ocupación: 68.5%
❌ Tasa de Cancelación: 9.7%
```

## 🐛 Troubleshooting

### Error: "No hay doctores, pacientes o schedules"

**Solución**: Ejecuta primero el seed principal:
```bash
npx prisma migrate reset --force
```

### Error: "Cannot find module"

**Solución**: Instala las dependencias:
```bash
pnpm install
```

### Los datos no se ven en los reportes

**Solución**: 
1. Verifica que el backend esté corriendo
2. Verifica que las fechas de los filtros incluyan los últimos 6 meses
3. Revisa la consola del navegador por errores

## 💡 Tips

1. **Desarrollo**: Ejecuta este seed solo UNA vez después del seed principal
2. **Testing**: Puedes modificar las constantes en el archivo para generar más o menos datos
3. **Producción**: NO ejecutes este seed en producción, solo usa el seed principal

## 📝 Notas

- Los datos son **ficticios** y generados aleatoriamente
- Los diagnósticos son genéricos y comunes
- Los ratings de doctores se calculan automáticamente basados en actividad
- Las fechas son relativas a la fecha de ejecución del script

---

**Creado para**: Sistema de Gestión de Clínica Perú  
**Versión**: 1.0.0  
**Última actualización**: 2025
