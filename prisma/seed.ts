import * as bcrypt from 'bcrypt';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ========== ADMIN ==========
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      dni: '12345678',
      firstName: 'Admin',
      lastName: 'Admin Admin',
      dayOfBirth: new Date('1990-01-01'),
      gender: 'MALE',
      role: 'ADMIN',
      profileImage: 'https://www.flaticon.com/free-icon/admin_9703596',
    },
  });

  // ========== PACIENTE ==========
  const patientPassword = await bcrypt.hash('patient123', 10);
  await prisma.user.upsert({
    where: { email: 'patient@example.com' },
    update: {},
    create: {
      email: 'patient@example.com',
      passwordHash: patientPassword,
      dni: '87654321',
      firstName: 'Juan',
      lastName: 'Pérez García',
      dayOfBirth: new Date('2000-05-10'),
      gender: 'MALE',
      role: 'PATIENT',
      profileImage:
        'https://w7.pngwing.com/pngs/791/121/png-transparent-health-care-medicine-physician-patient-contract-research-organization-infirm-text-hospital-surgery.png',
    },
  });

  // ========== CLÍNICA ==========
  const clinic = await prisma.clinic.upsert({
    where: { name: 'Clínica San Pablo Perú' },
    update: {},
    create: {
      name: 'Clínica San Pablo Perú',
      address: 'Av. El Polo 789, Santiago de Surco, Lima',
      ubigeoDept: 'LIMA',
      ubigeoProv: 'LIMA',
      ubigeoDist: 'SANTIAGO DE SURCO',
      phone: '01-610-3333',
      email: 'contacto@sanpabloperu.com',
      isActive: true,
    },
  });

  // ========== CLÍNICA 2: Centro Médico El Sol ==========
  const clinic2 = await prisma.clinic.upsert({
    where: { name: 'Centro Médico El Sol' },
    update: {},
    create: {
      name: 'Centro Médico El Sol',
      address: 'Jr. Las Flores 567',
      ubigeoDept: 'LIMA',
      ubigeoProv: 'LIMA',
      ubigeoDist: 'MIRAFLORES',
      phone: '01-567-8901',
      email: 'info@centroelsol.com',
    },
  });

  // ========== CLÍNICA 3: Policlínico Norte ==========
  const clinic3 = await prisma.clinic.upsert({
    where: { name: 'Policlínico Norte' },
    update: {},
    create: {
      name: 'Policlínico Norte',
      address: 'Av. Los Alisos 890',
      ubigeoDept: 'LIMA',
      ubigeoProv: 'LIMA',
      ubigeoDist: 'LOS OLIVOS',
      phone: '01-789-0123',
      email: 'admin@policliniconorte.com',
      isActive: false,
    },
  });

  // ========== CLÍNICA 4: Clínica Internacional ==========
  const clinic4 = await prisma.clinic.upsert({
    where: { name: 'Clínica Internacional' },
    update: {},
    create: {
      name: 'Clínica Internacional',
      address: 'Av. Guardia Civil 2345',
      ubigeoDept: 'LIMA',
      ubigeoProv: 'LIMA',
      ubigeoDist: 'SAN BORJA',
      phone: '01-345-6789',
      email: 'contacto@internacional.com.pe',
    },
  });

  // ========== CLÍNICA 5: Centro de Salud Esperanza ==========
  const clinic5 = await prisma.clinic.upsert({
    where: { name: 'Centro de Salud Esperanza' },
    update: {},
    create: {
      name: 'Centro de Salud Esperanza',
      address: 'Jr. Esperanza 456',
      ubigeoDept: 'LIMA',
      ubigeoProv: 'LIMA',
      ubigeoDist: 'VILLA EL SALVADOR',
      phone: '01-456-7890',
      email: null,
    },
  });

  // ========== ROOMS ==========
  await prisma.room.createMany({
    data: [
      {
        name: 'Consultorio 101',
        roomNumber: '101',
        roomType: 'CONSULTATION',
        floor: 1,
        capacity: 1,
        equipment: ['Escritorio', 'Camilla', 'Estetoscopio'],
        clinicId: clinic.id,
      },
      {
        name: 'Consultorio 202',
        roomNumber: '202',
        roomType: 'CONSULTATION',
        floor: 2,
        capacity: 1,
        equipment: ['Escritorio', 'Camilla'],
        clinicId: clinic.id,
      },
      {
        name: 'Consultorio 303',
        roomNumber: '303',
        roomType: 'SURGERY',
        floor: 3,
        capacity: 2,
        equipment: [
          'Mesa quirúrgica',
          'Monitor signos vitales',
          'Lámpara quirúrgica',
        ],
        clinicId: clinic.id,
      },
      {
        name: 'Laboratorio Central',
        roomNumber: 'LAB-1',
        roomType: 'LABORATORY',
        floor: 1,
        capacity: 5,
        equipment: ['Centrífuga', 'Microscopio', 'Refrigerador biomédico'],
        clinicId: clinic.id,
      },
    ],
    skipDuplicates: true,
  });

  // ========== ESPECIALIDADES ==========
  const cardiologia = await prisma.specialty.upsert({
    where: { name: 'Cardiología' },
    update: {},
    create: {
      name: 'Cardiología',
      description:
        'Especialidad médica que se encarga de la prevención, diagnóstico y tratamiento de enfermedades del corazón y vasos sanguíneos.',
    },
  });

  const pediatria = await prisma.specialty.upsert({
    where: { name: 'Pediatría' },
    update: {},
    create: {
      name: 'Pediatría',
      description:
        'Especialidad médica que se encarga de la prevención, diagnóstico y tratamiento de enfermedades del corazón y vasos sanguíneos.',
    },
  });

  const ginecologia = await prisma.specialty.upsert({
    where: { name: 'Ginecología' },
    update: {},
    create: {
      name: 'Ginecología',
      description:
        'Especialidad médica que se encarga de la prevención, diagnóstico y tratamiento de enfermedades del corazón y vasos sanguíneos.',
    },
  });

  // ========== DOCTOR 1 ==========
  const doctor1User = await prisma.user.upsert({
    where: { email: 'dr.ramirez@example.com' },
    update: {},
    create: {
      email: 'dr.ramirez@example.com',
      passwordHash: await bcrypt.hash('doctor123', 10),
      dni: '44556677',
      firstName: 'Carlos',
      lastName: 'Ramírez Lopez',
      dayOfBirth: new Date('1980-03-12'),
      gender: 'MALE',
      role: 'DOCTOR',
      profileImage:
        'https://static.vecteezy.com/system/resources/thumbnails/026/375/249/small_2x/ai-generative-portrait-of-confident-male-doctor-in-white-coat-and-stethoscope-standing-with-arms-crossed-and-looking-at-camera-photo.jpg',
    },
  });

  const doctor1 = await prisma.doctor.upsert({
    where: { cmp: 12345 },
    update: {},
    create: {
      cmp: 12345,
      userId: doctor1User.id,
      clinicId: clinic.id,
      specialtyId: cardiologia.id,
      yearsOfExperience: 15,
      consultationPrice: 150.0,
      rating: 3.5,
    },
  });

  // ========== DOCTOR 2 ==========
  const doctor2User = await prisma.user.upsert({
    where: { email: 'dra.gomez@example.com' },
    update: {},
    create: {
      email: 'dra.gomez@example.com',
      passwordHash: await bcrypt.hash('doctor456', 10),
      dni: '99887766',
      firstName: 'María',
      lastName: 'Gómez Fernández',
      dayOfBirth: new Date('1985-07-22'),
      gender: 'FEMALE',
      role: 'DOCTOR',
      profileImage:
        'https://media.istockphoto.com/id/1372002650/photo/cropped-portrait-of-an-attractive-young-female-doctor-standing-with-her-arms-folded-in-the.jpg?s=612x612&w=0&k=20&c=o1QtStNsowOU0HSof6xQ_jZMglU8ZK565gHd655U6S4=',
    },
  });

  const doctor2 = await prisma.doctor.upsert({
    where: { cmp: 67890 },
    update: {},
    create: {
      cmp: 67890,
      userId: doctor2User.id,
      clinicId: clinic.id,
      specialtyId: pediatria.id,
      yearsOfExperience: 10,
      consultationPrice: 120.0,
      rating: 4.5,
    },
  });

  // ====================== SCHEDULES ======================
  const schedule1 = await prisma.schedule.create({
    data: {
      dayOfWeek: 1, // Lunes
      startTime: '08:00',
      endTime: '12:00',
      slotMinutes: 30,
      doctorId: doctor1.id,
    },
  });

  const schedule2 = await prisma.schedule.create({
    data: {
      dayOfWeek: 3, // Miércoles
      startTime: '14:00',
      endTime: '18:00',
      slotMinutes: 30,
      doctorId: doctor2.id,
    },
  });

  const schedule3 = await prisma.schedule.create({
    data: {
      dayOfWeek: 5, // Viernes
      startTime: '09:00',
      endTime: '13:00',
      slotMinutes: 30,
      doctorId: doctor1.id,
    },
  });

  // ====================== SLOTS (generados automáticamente) ======================
  // Función mejorada para generar slots para los próximos N días
  async function generateSlotsForSchedules(daysAhead: number = 14) {
    const schedules = await prisma.schedule.findMany({
      where: { isActive: true },
      include: {
        doctor: true,
      },
    });

    let totalSlotsCreated = 0;

    for (const schedule of schedules) {
      // Obtener unavailabilities del doctor
      const unavailabilities = await prisma.doctorUnavailability.findMany({
        where: {
          doctorId: schedule.doctorId,
          startAt: {
            lte: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
          },
          endAt: {
            gte: new Date(),
          },
        },
      });

      const slots: Prisma.SlotCreateManyInput[] = [];
      const startDate = new Date();
      const endDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

      // Encontrar todas las fechas que coinciden con el día de la semana
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        if (currentDate.getDay() === schedule.dayOfWeek) {
          // Parsear horarios
          const [startHour, startMin] = schedule.startTime
            .split(':')
            .map(Number);
          const [endHour, endMin] = schedule.endTime.split(':').map(Number);

          // Generar slots para este día
          const dayStart = new Date(currentDate);
          dayStart.setHours(startHour, startMin, 0, 0);

          const dayEnd = new Date(currentDate);
          dayEnd.setHours(endHour, endMin, 0, 0);

          let slotStart = new Date(dayStart);

          while (slotStart < dayEnd) {
            const slotEnd = new Date(
              slotStart.getTime() + schedule.slotMinutes * 60000,
            );

            if (slotEnd > dayEnd) break;

            // Verificar si el slot se solapa con unavailabilities
            const isUnavailable = unavailabilities.some(
              (unavail) =>
                slotStart < unavail.endAt && slotEnd > unavail.startAt,
            );

            if (!isUnavailable) {
              slots.push({
                scheduleId: schedule.id,
                startAt: new Date(slotStart),
                endAt: new Date(slotEnd),
                status: 'FREE',
                isActive: true,
              });
            }

            slotStart = slotEnd;
          }
        }
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }

      if (slots.length > 0) {
        const result = await prisma.slot.createMany({
          data: slots,
          skipDuplicates: true,
        });
        totalSlotsCreated += result.count;
      }
    }

    return totalSlotsCreated;
  }

  // Generar slots para los próximos 14 días
  const slotsCreated = await generateSlotsForSchedules(14);
  console.log(`✅ ${slotsCreated} slots generados para los próximos 14 días`);

  // ====================== APPOINTMENTS ======================
  const patient = await prisma.user.findFirst({
    where: { role: 'PATIENT' },
  });

  const firstSlot = await prisma.slot.findFirst({
    where: { scheduleId: schedule1.id },
  });

  if (patient && firstSlot) {
    await prisma.appointment.create({
      data: {
        userId: patient.id,
        doctorId: doctor1.id,
        slotId: firstSlot.id,
        status: 'CONFIRMED',
        reason: 'Chequeo general',
        notes: 'Paciente refiere molestias leves en el pecho',
        confirmedAt: new Date(),
      },
    });

    // marcar slot como BOOKED
    await prisma.slot.update({
      where: { id: firstSlot.id },
      data: { status: 'BOOKED' },
    });
  }

  // ====================== DOCTOR UNAVAILABILITY ======================
  await prisma.doctorUnavailability.create({
    data: {
      doctorId: doctor2.id,
      startAt: new Date(new Date().setHours(9, 0, 0, 0)),
      endAt: new Date(new Date().setHours(12, 0, 0, 0)),
      reason: 'Congreso médico',
    },
  });
}

main()
  .then(() => {
    console.log(
      '✅ Seed ejecutado con éxito: Clínica San Pablo Perú inicializada',
    );
  })
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
