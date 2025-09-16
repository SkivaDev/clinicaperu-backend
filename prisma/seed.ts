import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

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
      names: 'Admin',
      fatherSurname: 'Admin',
      motherSurname: 'Admin',
      dayOfBirth: new Date('1990-01-01'),
      gender: 'MALE',
      role: 'ADMIN',
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
      names: 'Juan',
      fatherSurname: 'Pérez',
      motherSurname: 'García',
      dayOfBirth: new Date('2000-05-10'),
      gender: 'MALE',
      role: 'PATIENT',
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
      phone: '(01) 610-3333',
    },
  });

  // ========== ROOMS ==========
  await prisma.room.createMany({
    data: [
      { name: 'Consultorio 101', floor: '1', clinicId: clinic.id },
      { name: 'Consultorio 202', floor: '2', clinicId: clinic.id },
    ],
    skipDuplicates: true,
  });

  // ========== ESPECIALIDADES ==========
  const cardiologia = await prisma.specialty.upsert({
    where: { name: 'Cardiología' },
    update: {},
    create: { name: 'Cardiología' },
  });

  const pediatria = await prisma.specialty.upsert({
    where: { name: 'Pediatría' },
    update: {},
    create: { name: 'Pediatría' },
  });

  const ginecologia = await prisma.specialty.upsert({
    where: { name: 'Ginecología' },
    update: {},
    create: { name: 'Ginecología' },
  });

  // ========== DOCTOR 1 ==========
  const doctor1User = await prisma.user.upsert({
    where: { email: 'dr.ramirez@example.com' },
    update: {},
    create: {
      email: 'dr.ramirez@example.com',
      passwordHash: await bcrypt.hash('doctor123', 10),
      dni: '44556677',
      names: 'Carlos',
      fatherSurname: 'Ramírez',
      motherSurname: 'Lopez',
      dayOfBirth: new Date('1980-03-12'),
      gender: 'MALE',
      role: 'DOCTOR',
    },
  });

  await prisma.doctor.upsert({
    where: { cmp: 'CMP12345' },
    update: {},
    create: {
      cmp: 'CMP12345',
      userId: doctor1User.id,
      clinicId: clinic.id,
      specialtyId: cardiologia.id,
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
      names: 'María',
      fatherSurname: 'Gómez',
      motherSurname: 'Fernández',
      dayOfBirth: new Date('1985-07-22'),
      gender: 'FEMALE',
      role: 'DOCTOR',
    },
  });

  await prisma.doctor.upsert({
    where: { cmp: 'CMP67890' },
    update: {},
    create: {
      cmp: 'CMP67890',
      userId: doctor2User.id,
      clinicId: clinic.id,
      specialtyId: pediatria.id,
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
