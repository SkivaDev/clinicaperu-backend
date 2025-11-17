# 🛠️ Scripts de Mantenimiento de Base de Datos

Scripts para gestionar la base de datos en desarrollo y producción (Railway).

## 📋 Scripts Disponibles

### 1. `clean-duplicates.ts` - Limpiar Registros Duplicados

**Problema que resuelve:**
- El seed se ejecutó múltiples veces en Railway
- Hay slots, rooms y schedules duplicados
- Los pacientes ven múltiples slots en el mismo horario

**Qué hace:**
- ✅ Detecta slots duplicados (mismo schedule, fecha y hora)
- ✅ Detecta rooms duplicados (mismo nombre en la misma clínica)
- ✅ Detecta schedules duplicados
- ✅ Mantiene el registro más antiguo
- ✅ Migra appointments/schedules/slots a los registros que se mantienen
- ✅ Elimina los duplicados

**Uso:**

```bash
# Desarrollo local
npx ts-node scripts/clean-duplicates.ts

# Railway (recomendado)
railway run npx ts-node scripts/clean-duplicates.ts
```

**Salida esperada:**
```
🧹 Iniciando limpieza de duplicados...

📅 Limpiando slots duplicados...
  🔸 Encontrados 2 slots duplicados para schedule abc12345...
     Manteniendo: def67890...
     Eliminando: 1 duplicados
✅ 15 slots duplicados eliminados

🏥 Limpiando rooms duplicados...
✅ 3 rooms duplicados eliminados

📋 Limpiando schedules duplicados...
✅ 0 schedules duplicados eliminados

📊 RESUMEN DE LIMPIEZA:
   - Slots duplicados eliminados: 15
   - Rooms duplicados eliminados: 3
   - Schedules duplicados eliminados: 0
   - Total eliminados: 18

✅ Limpieza completada exitosamente.
```

---

### 2. `fix-slot-appointment-inconsistencies.ts` - Corregir Inconsistencias

**Problema que resuelve:**
- Error P2002: `Unique constraint failed on the fields: (slotId)`
- Slots en estado FREE que ya tienen appointments asociados
- Appointments PENDING con holds expirados

**Qué hace:**
- ✅ Detecta slots con appointments pero en estado incorrecto
- ✅ Actualiza el estado del slot según el appointment
- ✅ Elimina appointments PENDING expirados
- ✅ Libera slots de appointments cancelados

**Uso:**

```bash
# Desarrollo local
npx ts-node scripts/fix-slot-appointment-inconsistencies.ts

# Railway
railway run npx ts-node scripts/fix-slot-appointment-inconsistencies.ts
```

---

### 3. `reset-database.ts` - Reset Completo (⚠️ PELIGROSO)

**⚠️ ADVERTENCIA:** Este script BORRA TODOS LOS DATOS.

**Cuándo usarlo:**
- ✅ En desarrollo local cuando necesitas empezar de cero
- ✅ En Railway staging/testing (con `--force`)
- ❌ NUNCA en producción con datos reales

**Protecciones:**
- Requiere confirmación explícita
- Bloqueado en producción sin flag `--force`
- Muestra advertencia clara

**Uso:**

```bash
# Desarrollo local (con confirmación)
npx ts-node scripts/reset-database.ts

# Railway staging (requiere --force)
railway run npx ts-node scripts/reset-database.ts --force
```

**Qué hace:**
1. Ejecuta `prisma migrate reset --force --skip-seed`
2. Aplica todas las migraciones con `prisma migrate deploy`
3. Ejecuta el seed con `prisma db seed`

---

## 🚀 Flujo Recomendado para Railway

### Escenario 1: Limpiar Duplicados (Más Común)

```bash
# 1. Conectar a Railway
railway login
railway link

# 2. Limpiar duplicados
railway run npx ts-node scripts/clean-duplicates.ts

# 3. Corregir inconsistencias
railway run npx ts-node scripts/fix-slot-appointment-inconsistencies.ts

# 4. Verificar en la aplicación
# Los pacientes ya no deberían ver slots duplicados
```

### Escenario 2: Reset Completo (Solo si es necesario)

```bash
# ⚠️ ESTO BORRARÁ TODOS LOS DATOS

# 1. Conectar a Railway
railway login
railway link

# 2. Reset completo (requiere --force)
railway run npx ts-node scripts/reset-database.ts --force

# 3. Confirmar cuando se solicite
# Escribir "yes" o "y"

# 4. Esperar a que termine (puede tomar 2-5 minutos)
```

---

## 🔧 Configuración de Railway

### Evitar que el seed se ejecute automáticamente

En Railway, el seed se ejecuta automáticamente después de cada deploy si está configurado en `package.json`. Para evitar esto:

**Opción A: Comentar el script de seed en package.json**

```json
{
  "prisma": {
    // "seed": "ts-node prisma/seed.ts"
  }
}
```

**Opción B: Usar variable de entorno**

```bash
# En Railway Dashboard → Variables
SKIP_SEED=true
```

Y modificar `package.json`:

```json
{
  "prisma": {
    "seed": "if [ \"$SKIP_SEED\" != \"true\" ]; then ts-node prisma/seed.ts; fi"
  }
}
```

---

## 📊 Monitoreo

### Ver logs en Railway

```bash
# Ver logs en tiempo real
railway logs

# Ver logs de un servicio específico
railway logs --service backend
```

### Verificar estado de la base de datos

```bash
# Conectar a la base de datos
railway run psql $DATABASE_URL

# Contar slots
SELECT COUNT(*) FROM "Slot";

# Ver slots duplicados
SELECT "scheduleId", "startAt", COUNT(*) as count
FROM "Slot"
GROUP BY "scheduleId", "startAt"
HAVING COUNT(*) > 1;
```

---

## 🆘 Troubleshooting

### Error: "Cannot find module"

```bash
# Instalar dependencias
railway run pnpm install
```

### Error: "Permission denied"

```bash
# Dar permisos de ejecución
chmod +x scripts/*.ts
```

### Error: "Database connection failed"

```bash
# Verificar que DATABASE_URL esté configurado
railway run echo $DATABASE_URL
```

---

## 📝 Notas Importantes

1. **Siempre haz backup antes de ejecutar scripts destructivos**
2. **Los scripts son idempotentes**: Puedes ejecutarlos múltiples veces sin problemas
3. **Revisa los logs**: Los scripts muestran información detallada de lo que hacen
4. **Prueba en local primero**: Antes de ejecutar en Railway, prueba en tu entorno local

---

## 🔗 Enlaces Útiles

- [Railway CLI Docs](https://docs.railway.app/develop/cli)
- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Seeding Docs](https://www.prisma.io/docs/guides/database/seed-database)
