#!/usr/bin/env ts-node
/**
 * Script de limpieza: Corrige inconsistencias entre Slots y Appointments
 * 
 * Problema:
 * - Hay appointments que apuntan a slots que están en estado FREE/HELD
 * - Esto causa errores de unique constraint al intentar reservar esos slots
 * 
 * Solución:
 * 1. Detectar slots con appointments pero en estado incorrecto
 * 2. Actualizar el estado del slot según el appointment
 * 3. O eliminar appointments huérfanos si el slot está expirado
 * 
 * Uso:
 * npx ts-node scripts/fix-slot-appointment-inconsistencies.ts
 */

import { PrismaClient, SlotStatus, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Iniciando análisis de inconsistencias...\n');

  // 1. Encontrar slots con appointments pero en estado incorrecto
  const inconsistentSlots = await prisma.$queryRaw<any[]>`
    SELECT 
      s.id as "slotId",
      s.status as "slotStatus",
      s."holdExpiresAt",
      s."startAt",
      a.id as "appointmentId",
      a.status as "appointmentStatus",
      a."createdAt" as "appointmentCreatedAt"
    FROM "Slot" s
    INNER JOIN "Appointment" a ON a."slotId" = s.id
    WHERE s.status IN ('FREE', 'HELD')
    ORDER BY s."startAt" DESC
  `;

  console.log(`📊 Encontrados ${inconsistentSlots.length} slots inconsistentes:\n`);

  if (inconsistentSlots.length === 0) {
    console.log('✅ No hay inconsistencias. La base de datos está limpia.');
    return;
  }

  let fixed = 0;
  let deleted = 0;
  const now = new Date();

  for (const record of inconsistentSlots) {
    const slotStart = new Date(record.startAt);
    const isPast = slotStart < now;
    const holdExpires = record.holdExpiresAt ? new Date(record.holdExpiresAt) : null;
    const isHoldExpired = holdExpires && holdExpires < now;

    console.log(`\n🔸 Slot ${record.slotId.substring(0, 8)}...`);
    console.log(`   Estado actual: ${record.slotStatus}`);
    console.log(`   Appointment: ${record.appointmentId.substring(0, 8)}... (${record.appointmentStatus})`);
    console.log(`   Fecha slot: ${slotStart.toISOString()}`);
    console.log(`   Pasado: ${isPast ? 'Sí' : 'No'}`);
    console.log(`   Hold expirado: ${isHoldExpired ? 'Sí' : holdExpires ? 'No' : 'N/A'}`);

    // Decisión: ¿Qué hacer?
    if (isPast) {
      // Slot en el pasado: actualizar slot a BOOKED para consistencia histórica
      console.log(`   ➡️  Acción: Actualizar slot a BOOKED (histórico)`);
      await prisma.slot.update({
        where: { id: record.slotId },
        data: { status: SlotStatus.BOOKED },
      });
      fixed++;
    } else if (record.appointmentStatus === 'PENDING' && isHoldExpired) {
      // Appointment PENDING con hold expirado: eliminar appointment y liberar slot
      console.log(`   ➡️  Acción: Eliminar appointment PENDING expirado y liberar slot`);
      
      // Eliminar primero el payment asociado si existe
      await prisma.payment.deleteMany({
        where: { appointmentId: record.appointmentId },
      });
      
      // Luego eliminar el appointment
      await prisma.appointment.delete({
        where: { id: record.appointmentId },
      });

      // Liberar el slot
      await prisma.slot.update({
        where: { id: record.slotId },
        data: { 
          status: SlotStatus.FREE,
          holdExpiresAt: null,
        },
      });
      deleted++;
    } else if (record.appointmentStatus === 'CONFIRMED' || record.appointmentStatus === 'COMPLETED') {
      // Appointment confirmado o completado: actualizar slot a BOOKED
      console.log(`   ➡️  Acción: Actualizar slot a BOOKED`);
      await prisma.slot.update({
        where: { id: record.slotId },
        data: { status: SlotStatus.BOOKED },
      });
      fixed++;
    } else if (record.appointmentStatus === 'PENDING' && !isHoldExpired) {
      // Appointment PENDING válido: actualizar slot a HELD
      console.log(`   ➡️  Acción: Actualizar slot a HELD`);
      await prisma.slot.update({
        where: { id: record.slotId },
        data: { status: SlotStatus.HELD },
      });
      fixed++;
    } else if (record.appointmentStatus === 'CANCELLED' || record.appointmentStatus === 'NO_SHOW') {
      // Appointment cancelado: liberar slot
      console.log(`   ➡️  Acción: Liberar slot (appointment ${record.appointmentStatus})`);
      await prisma.slot.update({
        where: { id: record.slotId },
        data: { 
          status: SlotStatus.FREE,
          holdExpiresAt: null,
        },
      });
      fixed++;
    } else {
      // Caso por defecto: actualizar a BOOKED por seguridad
      console.log(`   ➡️  Acción: Actualizar slot a BOOKED (caso por defecto)`);
      await prisma.slot.update({
        where: { id: record.slotId },
        data: { status: SlotStatus.BOOKED },
      });
      fixed++;
    }
  }

  console.log(`\n✅ Proceso completado:`);
  console.log(`   - ${fixed} slots corregidos`);
  console.log(`   - ${deleted} appointments expirados eliminados`);
  console.log(`\n💡 Recomendación: Ejecuta este script periódicamente o después de migraciones.`);
}

main()
  .catch((e) => {
    console.error('❌ Error durante la limpieza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
