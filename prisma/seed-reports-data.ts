import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para agregar datos adicionales enfocados en reportes
 * Este script se ejecuta DESPUÉS del seed principal
 * Genera datos históricos de los últimos 6 meses para análisis completo
 */

async function addReportsData() {
  console.log('\n📊 Agregando datos para reportes y analíticas...\n');

  // Obtener doctores y pacientes existentes
  const doctors = await prisma.doctor.findMany({
    include: { user: true, specialty: true },
  });
  const patients = await prisma.user.findMany({
    where: { role: 'PATIENT' },
  });
  const schedules = await prisma.schedule.findMany({
    where: { isActive: true },
  });

  if (doctors.length === 0 || patients.length === 0 || schedules.length === 0) {
    console.error('❌ No hay doctores, pacientes o schedules. Ejecuta el seed principal primero.');
    return;
  }

  // ========== GENERAR CITAS HISTÓRICAS DE LOS ÚLTIMOS 6 MESES ==========
  console.log('📅 Generando citas históricas de los últimos 6 meses...');

  const appointmentStatuses = ['ATTENDED', 'CANCELLED', 'NO_SHOW', 'ATTENDED', 'ATTENDED', 'ATTENDED'];
  const paymentMethods = ['SIMULATED_CARD', 'CASH_AT_CLINIC', 'SIMULATED_CARD', 'CASH_AT_CLINIC'];
  const consultationTypes = ['CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'CONSULTATION', 'CONSULTATION'];
  
  const diagnoses = [
    'Hipertensión arterial controlada',
    'Diabetes mellitus tipo 2',
    'Infección respiratoria aguda',
    'Gastritis crónica',
    'Migraña',
    'Dermatitis atópica',
    'Conjuntivitis alérgica',
    'Lumbalgia mecánica',
    'Ansiedad generalizada',
    'Faringitis aguda',
    'Otitis media',
    'Rinitis alérgica',
    'Artritis reumatoide',
    'Hipotiroidismo',
    'Asma bronquial',
  ];

  let totalAppointmentsCreated = 0;
  let totalPaymentsCreated = 0;
  let totalRecordsCreated = 0;

  // Generar citas para los últimos 6 meses (180 días)
  for (let daysAgo = 180; daysAgo >= 0; daysAgo -= 2) {
    // Crear 2-5 citas cada 2 días
    const appointmentsPerDay = Math.floor(Math.random() * 4) + 2;

    for (let i = 0; i < appointmentsPerDay; i++) {
      const randomDoctor = doctors[Math.floor(Math.random() * doctors.length)];
      const randomPatient = patients[Math.floor(Math.random() * patients.length)];
      const randomSchedule = schedules[Math.floor(Math.random() * schedules.length)];

      // Fecha de la cita
      const appointmentDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      appointmentDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);

      // Crear slot para esta cita
      const slot = await prisma.slot.create({
        data: {
          scheduleId: randomSchedule.id,
          startAt: appointmentDate,
          endAt: new Date(appointmentDate.getTime() + 30 * 60000),
          status: 'BOOKED',
          isActive: true,
        },
      });

      // Determinar estado de la cita (más ATTENDED para tener datos)
      const status = daysAgo > 7 
        ? appointmentStatuses[Math.floor(Math.random() * appointmentStatuses.length)]
        : 'CONFIRMED'; // Citas futuras confirmadas

      const appointment = await prisma.appointment.create({
        data: {
          userId: randomPatient.id,
          doctorId: randomDoctor.id,
          slotId: slot.id,
          status: status as any,
          reason: diagnoses[Math.floor(Math.random() * diagnoses.length)],
          notes: `Consulta ${status === 'ATTENDED' ? 'realizada' : 'programada'}`,
          confirmedAt: status !== 'CANCELLED' ? new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000) : undefined,
          attendedAt: status === 'ATTENDED' ? appointmentDate : undefined,
          cancelledAt: status === 'CANCELLED' ? new Date(appointmentDate.getTime() - 12 * 60 * 60 * 1000) : undefined,
        },
      });

      totalAppointmentsCreated++;

      // Crear expediente médico para citas ATTENDED
      if (status === 'ATTENDED') {
        const diagnosis = diagnoses[Math.floor(Math.random() * diagnoses.length)];
        const recordType = consultationTypes[Math.floor(Math.random() * consultationTypes.length)];

        await prisma.medicalRecord.create({
          data: {
            appointmentId: appointment.id,
            recordType: recordType as any,
            diagnosis: diagnosis,
            prescription: 'Tratamiento indicado según diagnóstico',
            notes: `Consulta de ${randomDoctor.specialty?.name || 'medicina general'}`,
            vitalSigns: {
              bloodPressure: `${110 + Math.floor(Math.random() * 30)}/${70 + Math.floor(Math.random() * 20)}`,
              heartRate: 60 + Math.floor(Math.random() * 40),
              temperature: 36 + Math.random() * 1.5,
              weight: 50 + Math.floor(Math.random() * 50),
              height: 150 + Math.floor(Math.random() * 40),
            },
            createdById: randomDoctor.userId,
          },
        });

        totalRecordsCreated++;
      }

      // Crear pago para citas ATTENDED o CONFIRMED
      if (status === 'ATTENDED' || status === 'CONFIRMED') {
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        const isPaid = status === 'ATTENDED' || Math.random() > 0.3; // 70% de CONFIRMED están pagadas

        await prisma.payment.create({
          data: {
            appointmentId: appointment.id,
            amount: randomDoctor.consultationPrice || 100 + Math.floor(Math.random() * 100),
            currency: 'PEN',
            paymentMethod: paymentMethod as any,
            status: isPaid ? 'COMPLETED' : 'PENDING',
            transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            metadata: {
              patientName: `${randomPatient.firstName} ${randomPatient.lastName}`,
              doctorName: `${randomDoctor.user.firstName} ${randomDoctor.user.lastName}`,
              specialty: randomDoctor.specialty?.name || 'General',
              appointmentDate: appointmentDate,
            },
            paidAt: isPaid ? appointmentDate : undefined,
          },
        });

        totalPaymentsCreated++;
      }
    }
  }

  console.log(`✅ ${totalAppointmentsCreated} citas históricas creadas`);
  console.log(`✅ ${totalRecordsCreated} expedientes médicos creados`);
  console.log(`✅ ${totalPaymentsCreated} pagos creados`);

  // ========== AGREGAR MÁS PACIENTES PARA MÉTRICAS ==========
  console.log('\n👥 Agregando más pacientes para métricas de retención...');

  const additionalPatients: User[] = [];
  for (let i = 0; i < 20; i++) {
    const patient = await prisma.user.create({
      data: {
        email: `patient${100 + i}@example.com`,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz', // Hash ficticio
        dni: `${10000000 + i}`,
        firstName: ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Carmen'][Math.floor(Math.random() * 6)],
        lastName: ['García', 'Rodríguez', 'López', 'Martínez', 'Pérez', 'González'][Math.floor(Math.random() * 6)],
        dayOfBirth: new Date(1970 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        role: 'PATIENT',
        phone: `+5198${1000000 + Math.floor(Math.random() * 9000000)}`,
      },
    });
    additionalPatients.push(patient);
  }

  console.log(`✅ ${additionalPatients.length} pacientes adicionales creados`);

  // ========== CREAR CITAS PARA NUEVOS PACIENTES (PACIENTES NUEVOS) ==========
  console.log('\n🆕 Creando citas para pacientes nuevos (últimos 30 días)...');

  let newPatientsAppointments = 0;
  for (const patient of additionalPatients.slice(0, 15)) {
    const randomDoctor = doctors[Math.floor(Math.random() * doctors.length)];
    const randomSchedule = schedules[Math.floor(Math.random() * schedules.length)];
    
    // Cita en los últimos 30 días
    const daysAgo = Math.floor(Math.random() * 30);
    const appointmentDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    appointmentDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

    const slot = await prisma.slot.create({
      data: {
        scheduleId: randomSchedule.id,
        startAt: appointmentDate,
        endAt: new Date(appointmentDate.getTime() + 30 * 60000),
        status: 'BOOKED',
        isActive: true,
      },
    });

    await prisma.appointment.create({
      data: {
        userId: patient.id,
        doctorId: randomDoctor.id,
        slotId: slot.id,
        status: daysAgo > 5 ? 'ATTENDED' : 'CONFIRMED',
        reason: 'Primera consulta',
        notes: 'Paciente nuevo en el sistema',
        confirmedAt: new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000),
        attendedAt: daysAgo > 5 ? appointmentDate : undefined,
      },
    });

    newPatientsAppointments++;
  }

  console.log(`✅ ${newPatientsAppointments} citas de pacientes nuevos creadas`);

  // ========== ACTUALIZAR RATINGS DE DOCTORES ==========
  console.log('\n⭐ Actualizando ratings de doctores basado en actividad...');

  for (const doctor of doctors) {
    const appointmentsCount = await prisma.appointment.count({
      where: {
        doctorId: doctor.id,
        status: 'ATTENDED',
      },
    });

    // Rating basado en cantidad de citas (simulado)
    const baseRating = 4.0;
    const bonus = Math.min(appointmentsCount / 100, 0.9);
    const newRating = Math.min(baseRating + bonus + Math.random() * 0.3, 5.0);

    await prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        rating: parseFloat(newRating.toFixed(1)),
      },
    });
  }

  console.log('✅ Ratings de doctores actualizados');

  // ========== ESTADÍSTICAS FINALES ==========
  const totalStats = {
    totalAppointments: await prisma.appointment.count(),
    totalPayments: await prisma.payment.count(),
    totalMedicalRecords: await prisma.medicalRecord.count(),
    totalPatients: await prisma.user.count({ where: { role: 'PATIENT' } }),
    totalDoctors: await prisma.doctor.count(),
    attendedAppointments: await prisma.appointment.count({ where: { status: 'ATTENDED' } }),
    confirmedAppointments: await prisma.appointment.count({ where: { status: 'CONFIRMED' } }),
    cancelledAppointments: await prisma.appointment.count({ where: { status: 'CANCELLED' } }),
    pendingAppointments: await prisma.appointment.count({ where: { status: 'PENDING' } }),
    noShowAppointments: await prisma.appointment.count({ where: { status: 'NO_SHOW' } }),
    completedPayments: await prisma.payment.count({ where: { status: 'COMPLETED' } }),
    pendingPayments: await prisma.payment.count({ where: { status: 'PENDING' } }),
  };

  console.log('\n📊 ESTADÍSTICAS FINALES DEL SISTEMA:');
  console.log('=====================================');
  console.log(`👥 Total Pacientes: ${totalStats.totalPatients}`);
  console.log(`👨‍⚕️ Total Doctores: ${totalStats.totalDoctors}`);
  console.log(`📅 Total Citas: ${totalStats.totalAppointments}`);
  console.log(`   - Atendidas: ${totalStats.attendedAppointments}`);
  console.log(`   - Confirmadas: ${totalStats.confirmedAppointments}`);
  console.log(`   - Canceladas: ${totalStats.cancelledAppointments}`);
  console.log(`   - Pendientes: ${totalStats.pendingAppointments}`);
  console.log(`   - No Show: ${totalStats.noShowAppointments}`);
  console.log(`💳 Total Pagos: ${totalStats.totalPayments}`);
  console.log(`   - Completados: ${totalStats.completedPayments}`);
  console.log(`   - Pendientes: ${totalStats.pendingPayments}`);
  console.log(`📋 Total Expedientes Médicos: ${totalStats.totalMedicalRecords}`);
  console.log('=====================================\n');

  // Calcular ingresos totales
  const totalRevenue = await prisma.payment.aggregate({
    where: { status: 'COMPLETED' },
    _sum: { amount: true },
  });

  console.log(`💰 Ingresos Totales: S/. ${totalRevenue._sum.amount?.toFixed(2) || '0.00'}`);

  // Tasa de ocupación aproximada
  const totalSlots = await prisma.slot.count();
  const bookedSlots = await prisma.slot.count({ where: { status: 'BOOKED' } });
  const occupancyRate = totalSlots > 0 ? ((bookedSlots / totalSlots) * 100).toFixed(1) : '0.0';

  console.log(`📊 Tasa de Ocupación: ${occupancyRate}%`);

  // Tasa de cancelación
  const cancellationRate = totalStats.totalAppointments > 0
    ? ((totalStats.cancelledAppointments / totalStats.totalAppointments) * 100).toFixed(1)
    : '0.0';

  console.log(`❌ Tasa de Cancelación: ${cancellationRate}%`);

  console.log('\n✅ Datos de reportes agregados exitosamente!');
  console.log('🎯 El sistema ahora tiene suficientes datos para mostrar reportes completos\n');
}

// Ejecutar
addReportsData()
  .then(() => {
    console.log('✅ Script de datos de reportes completado');
  })
  .catch((e) => {
    console.error('❌ Error agregando datos de reportes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
