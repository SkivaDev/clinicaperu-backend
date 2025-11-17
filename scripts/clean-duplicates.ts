#!/usr/bin/env ts-node
/**
 * Script para limpiar registros duplicados en la base de datos
 * 
 * Problema:
 * - El seed se ejecutó múltiples veces en Railway
 * - Hay slots duplicados (mismo doctor, misma fecha/hora)
 * - Hay rooms duplicados
 * - Otros registros pueden estar duplicados
 * 
 * Solución:
 * - Identifica duplicados por campos únicos lógicos
 * - Mantiene el registro más antiguo (createdAt)
 * - Elimina los duplicados más recientes
 * - Actualiza referencias si es necesario
 * 
 * Uso:
 * npx ts-node scripts/clean-duplicates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Iniciando limpieza de duplicados...\n');

  // ============================================
  // 1. LIMPIAR SLOTS DUPLICADOS
  // ============================================
  console.log('📅 Limpiando slots duplicados...');
  
  // Encontrar slots duplicados (mismo scheduleId, startAt, endAt)
  const duplicateSlots = await prisma.$queryRaw<any[]>`
    SELECT 
      "scheduleId",
      "startAt",
      "endAt",
      COUNT(*) as count,
      ARRAY_AGG(id ORDER BY "createdAt" ASC) as ids
    FROM "Slot"
    GROUP BY "scheduleId", "startAt", "endAt"
    HAVING COUNT(*) > 1
  `;

  let slotsDeleted = 0;
  for (const group of duplicateSlots) {
    const [keepId, ...deleteIds] = group.ids;
    console.log(`  🔸 Encontrados ${group.count} slots duplicados para schedule ${group.scheduleId.substring(0, 8)}...`);
    console.log(`     Manteniendo: ${keepId.substring(0, 8)}...`);
    console.log(`     Eliminando: ${deleteIds.length} duplicados`);

    // Verificar si alguno de los duplicados tiene appointments
    for (const deleteId of deleteIds) {
      const hasAppointment = await prisma.appointment.findUnique({
        where: { slotId: deleteId },
        select: { id: true },
      });

      if (hasAppointment) {
        console.log(`     ⚠️  Slot ${deleteId.substring(0, 8)}... tiene appointment, migrando a ${keepId.substring(0, 8)}...`);
        
        // Migrar el appointment al slot que vamos a mantener
        await prisma.appointment.update({
          where: { id: hasAppointment.id },
          data: { slotId: keepId },
        });
      }

      // Eliminar el slot duplicado
      await prisma.slot.delete({
        where: { id: deleteId },
      });
      slotsDeleted++;
    }
  }

  console.log(`✅ ${slotsDeleted} slots duplicados eliminados\n`);

  // ============================================
  // 2. LIMPIAR ROOMS DUPLICADOS
  // ============================================
  console.log('🏥 Limpiando rooms duplicados...');
  
  const duplicateRooms = await prisma.$queryRaw<any[]>`
    SELECT 
      "clinicId",
      "name",
      COUNT(*) as count,
      ARRAY_AGG(id ORDER BY "createdAt" ASC) as ids
    FROM "Room"
    GROUP BY "clinicId", "name"
    HAVING COUNT(*) > 1
  `;

  let roomsDeleted = 0;
  for (const group of duplicateRooms) {
    const [keepId, ...deleteIds] = group.ids;
    console.log(`  🔸 Encontrados ${group.count} rooms duplicados: ${group.name}`);
    console.log(`     Manteniendo: ${keepId.substring(0, 8)}...`);
    console.log(`     Eliminando: ${deleteIds.length} duplicados`);

    // Verificar si alguno de los duplicados tiene schedules
    for (const deleteId of deleteIds) {
      const schedules = await prisma.schedule.findMany({
        where: { roomId: deleteId },
        select: { id: true },
      });

      if (schedules.length > 0) {
        console.log(`     ⚠️  Room ${deleteId.substring(0, 8)}... tiene ${schedules.length} schedules, migrando a ${keepId.substring(0, 8)}...`);
        
        // Migrar los schedules al room que vamos a mantener
        await prisma.schedule.updateMany({
          where: { roomId: deleteId },
          data: { roomId: keepId },
        });
      }

      // Eliminar el room duplicado
      await prisma.room.delete({
        where: { id: deleteId },
      });
      roomsDeleted++;
    }
  }

  console.log(`✅ ${roomsDeleted} rooms duplicados eliminados\n`);

  // ============================================
  // 3. LIMPIAR SCHEDULES DUPLICADOS
  // ============================================
  console.log('📋 Limpiando schedules duplicados...');
  
  const duplicateSchedules = await prisma.$queryRaw<any[]>`
    SELECT 
      "doctorId",
      "roomId",
      "dayOfWeek",
      "startTime",
      "endTime",
      COUNT(*) as count,
      ARRAY_AGG(id ORDER BY "createdAt" ASC) as ids
    FROM "Schedule"
    GROUP BY "doctorId", "roomId", "dayOfWeek", "startTime", "endTime"
    HAVING COUNT(*) > 1
  `;

  let schedulesDeleted = 0;
  for (const group of duplicateSchedules) {
    const [keepId, ...deleteIds] = group.ids;
    console.log(`  🔸 Encontrados ${group.count} schedules duplicados`);
    console.log(`     Manteniendo: ${keepId.substring(0, 8)}...`);
    console.log(`     Eliminando: ${deleteIds.length} duplicados`);

    // Verificar si alguno de los duplicados tiene slots
    for (const deleteId of deleteIds) {
      const slots = await prisma.slot.findMany({
        where: { scheduleId: deleteId },
        select: { id: true },
      });

      if (slots.length > 0) {
        console.log(`     ⚠️  Schedule ${deleteId.substring(0, 8)}... tiene ${slots.length} slots, migrando a ${keepId.substring(0, 8)}...`);
        
        // Migrar los slots al schedule que vamos a mantener
        await prisma.slot.updateMany({
          where: { scheduleId: deleteId },
          data: { scheduleId: keepId },
        });
      }

      // Eliminar el schedule duplicado
      await prisma.schedule.delete({
        where: { id: deleteId },
      });
      schedulesDeleted++;
    }
  }

  console.log(`✅ ${schedulesDeleted} schedules duplicados eliminados\n`);

  // ============================================
  // RESUMEN
  // ============================================
  console.log('📊 RESUMEN DE LIMPIEZA:');
  console.log(`   - Slots duplicados eliminados: ${slotsDeleted}`);
  console.log(`   - Rooms duplicados eliminados: ${roomsDeleted}`);
  console.log(`   - Schedules duplicados eliminados: ${schedulesDeleted}`);
  console.log(`   - Total eliminados: ${slotsDeleted + roomsDeleted + schedulesDeleted}\n`);

  if (slotsDeleted + roomsDeleted + schedulesDeleted === 0) {
    console.log('✅ No se encontraron duplicados. La base de datos está limpia.');
  } else {
    console.log('✅ Limpieza completada exitosamente.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error durante la limpieza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
