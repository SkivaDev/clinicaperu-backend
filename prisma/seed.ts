import * as bcrypt from 'bcrypt';
import { PrismaClient, Prisma } from '@prisma/client';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

const prisma = new PrismaClient();

// Obtener contraseñas desde variables de entorno
// ⚠️ En producción, estas variables DEBEN estar configuradas con contraseñas seguras
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';
const SEED_PATIENT_PASSWORD = process.env.SEED_PATIENT_PASSWORD || 'patient123';
const SEED_DOCTOR_PASSWORD = process.env.SEED_DOCTOR_PASSWORD || 'doctor123';

// Advertencia si se están usando contraseñas por defecto en producción
if (process.env.NODE_ENV === 'production') {
  if (
    !process.env.SEED_ADMIN_PASSWORD ||
    !process.env.SEED_PATIENT_PASSWORD ||
    !process.env.SEED_DOCTOR_PASSWORD
  ) {
    console.warn(
      '⚠️⚠️⚠️ WARNING: Using default passwords in PRODUCTION environment!',
    );
    console.warn(
      '⚠️ Set SEED_ADMIN_PASSWORD, SEED_PATIENT_PASSWORD, and SEED_DOCTOR_PASSWORD in your .env file',
    );
  }
}

async function main() {
  // ========== ADMIN ==========
  const adminPassword = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'zeusnewlev@gmail.com',
      passwordHash: adminPassword,
      dni: '12345678',
      firstName: 'Admin',
      lastName: 'GOD',
      dayOfBirth: new Date('1990-01-01'),
      gender: 'MALE',
      role: 'ADMIN',
      profileImage: 'profile-images/default-admins/admin.webp',
    },
  });

  // ========== PACIENTE ==========
  const patientPassword = await bcrypt.hash(SEED_PATIENT_PASSWORD, 10);
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
      profileImage: 'profile-images/default-patients/patientUno.webp',
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
  await prisma.clinic.upsert({
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
  const medicinaGeneral = await prisma.specialty.upsert({
    where: { name: 'Medicina General' },
    update: {},
    create: {
      name: 'Medicina General',
      description:
        'Especialidad médica que se enfoca en la atención integral del paciente, abarcando la prevención, diagnóstico y tratamiento de enfermedades comunes, así como la promoción de la salud en todas las etapas de la vida.',
    },
  });

  const pediatria = await prisma.specialty.upsert({
    where: { name: 'Pediatría' },
    update: {},
    create: {
      name: 'Pediatría',
      description:
        'Especialidad médica que se encarga del cuidado integral de la salud de niños y adolescentes desde el nacimiento hasta los 18 años.',
    },
  });

  const ginecologia = await prisma.specialty.upsert({
    where: { name: 'Ginecología' },
    update: {},
    create: {
      name: 'Ginecología',
      description:
        'Especialidad médica que se centra en la salud del sistema reproductor femenino y el tratamiento de enfermedades ginecológicas.',
    },
  });

  const traumatologia = await prisma.specialty.upsert({
    where: { name: 'Traumatología' },
    update: {},
    create: {
      name: 'Traumatología',
      description:
        'Especialidad que trata lesiones del sistema musculoesquelético, fracturas, luxaciones y traumatismos.',
    },
  });

  const dermatologia = await prisma.specialty.upsert({
    where: { name: 'Dermatología' },
    update: {},
    create: {
      name: 'Dermatología',
      description:
        'Especialidad médica dedicada al diagnóstico y tratamiento de enfermedades de la piel, cabello y uñas.',
    },
  });

  const oftalmologia = await prisma.specialty.upsert({
    where: { name: 'Oftalmología' },
    update: {},
    create: {
      name: 'Oftalmología',
      description:
        'Especialidad médica que estudia y trata las enfermedades del ojo y sus anexos.',
    },
  });

  const neurologia = await prisma.specialty.upsert({
    where: { name: 'Neurología' },
    update: {},
    create: {
      name: 'Neurología',
      description:
        'Especialidad que se ocupa del diagnóstico y tratamiento de enfermedades del sistema nervioso.',
    },
  });

  const psiquiatria = await prisma.specialty.upsert({
    where: { name: 'Psiquiatría' },
    update: {},
    create: {
      name: 'Psiquiatría',
      description:
        'Especialidad médica dedicada al estudio, diagnóstico y tratamiento de trastornos mentales.',
    },
  });

  const otorrinolaringologia = await prisma.specialty.upsert({
    where: { name: 'Otorrinolaringología' },
    update: {},
    create: {
      name: 'Otorrinolaringología',
      description:
        'Especialidad que trata enfermedades del oído, nariz y garganta.',
    },
  });

  const urologia = await prisma.specialty.upsert({
    where: { name: 'Urología' },
    update: {},
    create: {
      name: 'Urología',
      description:
        'Especialidad que se encarga del estudio y tratamiento del aparato urinario y reproductor masculino.',
    },
  });

  const endocrinologia = await prisma.specialty.upsert({
    where: { name: 'Endocrinología' },
    update: {},
    create: {
      name: 'Endocrinología',
      description:
        'Especialidad que estudia las hormonas y trata enfermedades del sistema endocrino.',
    },
  });

  // ========== MÁS PACIENTES ==========
  const patient2Password = await bcrypt.hash(SEED_PATIENT_PASSWORD, 10);
  const patient2 = await prisma.user.upsert({
    where: { email: 'maria.lopez@example.com' },
    update: {},
    create: {
      email: 'maria.lopez@example.com',
      passwordHash: patient2Password,
      dni: '45678901',
      firstName: 'María',
      lastName: 'López Sánchez',
      dayOfBirth: new Date('1995-08-15'),
      gender: 'FEMALE',
      role: 'PATIENT',
      phone: '+51987654321',
    },
  });

  const patient3 = await prisma.user.upsert({
    where: { email: 'carlos.torres@example.com' },
    update: {},
    create: {
      email: 'carlos.torres@example.com',
      passwordHash: await bcrypt.hash(SEED_PATIENT_PASSWORD, 10),
      dni: '56789012',
      firstName: 'Carlos',
      lastName: 'Torres Mendoza',
      dayOfBirth: new Date('1988-03-20'),
      gender: 'MALE',
      role: 'PATIENT',
      phone: '+51998765432',
    },
  });

  const patient4 = await prisma.user.upsert({
    where: { email: 'ana.rodriguez@example.com' },
    update: {},
    create: {
      email: 'ana.rodriguez@example.com',
      passwordHash: await bcrypt.hash(SEED_PATIENT_PASSWORD, 10),
      dni: '67890123',
      firstName: 'Ana',
      lastName: 'Rodríguez Flores',
      dayOfBirth: new Date('1992-11-05'),
      gender: 'FEMALE',
      role: 'PATIENT',
      phone: '+51976543210',
    },
  });

  const patient5 = await prisma.user.upsert({
    where: { email: 'pedro.martinez@example.com' },
    update: {},
    create: {
      email: 'pedro.martinez@example.com',
      passwordHash: await bcrypt.hash(SEED_PATIENT_PASSWORD, 10),
      dni: '78901234',
      firstName: 'Pedro',
      lastName: 'Martínez Díaz',
      dayOfBirth: new Date('1985-06-12'),
      gender: 'MALE',
      role: 'PATIENT',
    },
  });

  const patient6 = await prisma.user.upsert({
    where: { email: 'lucia.garcia@example.com' },
    update: {},
    create: {
      email: 'lucia.garcia@example.com',
      passwordHash: await bcrypt.hash(SEED_PATIENT_PASSWORD, 10),
      dni: '89012345',
      firstName: 'Lucía',
      lastName: 'García Pérez',
      dayOfBirth: new Date('1998-09-25'),
      gender: 'FEMALE',
      role: 'PATIENT',
      phone: '+51965432109',
    },
  });

  const patient7 = await prisma.user.upsert({
    where: { email: 'roberto.silva@example.com' },
    update: {},
    create: {
      email: 'roberto.silva@example.com',
      passwordHash: await bcrypt.hash(SEED_PATIENT_PASSWORD, 10),
      dni: '90123456',
      firstName: 'Roberto',
      lastName: 'Silva Castro',
      dayOfBirth: new Date('1975-02-18'),
      gender: 'MALE',
      role: 'PATIENT',
    },
  });

  const patient8 = await prisma.user.upsert({
    where: { email: 'sofia.ramirez@example.com' },
    update: {},
    create: {
      email: 'sofia.ramirez@example.com',
      passwordHash: await bcrypt.hash(SEED_PATIENT_PASSWORD, 10),
      dni: '01234567',
      firstName: 'Sofía',
      lastName: 'Ramírez Luna',
      dayOfBirth: new Date('2005-12-30'),
      gender: 'FEMALE',
      role: 'PATIENT',
      phone: '+51954321098',
    },
  });

  // ========== MÁS ROOMS PARA OTRAS CLÍNICAS ==========
  await prisma.room.createMany({
    data: [
      // Rooms para Centro Médico El Sol (clinic2)
      {
        name: 'Consultorio A1',
        roomNumber: 'A1',
        roomType: 'CONSULTATION',
        floor: 1,
        capacity: 1,
        equipment: ['Escritorio', 'Camilla', 'Computadora'],
        clinicId: clinic2.id,
      },
      {
        name: 'Consultorio A2',
        roomNumber: 'A2',
        roomType: 'CONSULTATION',
        floor: 1,
        capacity: 1,
        equipment: ['Escritorio', 'Camilla', 'Oftalmoscopio'],
        clinicId: clinic2.id,
      },
      {
        name: 'Sala de Emergencias',
        roomNumber: 'ER-1',
        roomType: 'EMERGENCY',
        floor: 1,
        capacity: 3,
        equipment: ['Desfibrilador', 'Monitor', 'Camillas'],
        clinicId: clinic2.id,
      },
      // Rooms para Clínica Internacional (clinic4)
      {
        name: 'Consultorio 401',
        roomNumber: '401',
        roomType: 'CONSULTATION',
        floor: 4,
        capacity: 1,
        equipment: ['Escritorio', 'Camilla', 'Tensiómetro'],
        clinicId: clinic4.id,
      },
      {
        name: 'Consultorio 402',
        roomNumber: '402',
        roomType: 'CONSULTATION',
        floor: 4,
        capacity: 1,
        equipment: ['Escritorio', 'Camilla', 'Nebulizador'],
        clinicId: clinic4.id,
      },
      {
        name: 'UCI Principal',
        roomNumber: 'ICU-1',
        roomType: 'ICU',
        floor: 5,
        capacity: 8,
        equipment: [
          'Ventiladores',
          'Monitores cardíacos',
          'Bombas de infusión',
        ],
        clinicId: clinic4.id,
      },
      {
        name: 'Sala de Radiología',
        roomNumber: 'RAD-1',
        roomType: 'RADIOLOGY',
        floor: 2,
        capacity: 2,
        equipment: ['Equipo de rayos X', 'Ecógrafo', 'Tomógrafo'],
        clinicId: clinic4.id,
      },
      // Rooms para Centro de Salud Esperanza (clinic5)
      {
        name: 'Consultorio General 1',
        roomNumber: 'CG-1',
        roomType: 'CONSULTATION',
        floor: 1,
        capacity: 1,
        equipment: ['Escritorio', 'Camilla'],
        clinicId: clinic5.id,
      },
      {
        name: 'Consultorio General 2',
        roomNumber: 'CG-2',
        roomType: 'CONSULTATION',
        floor: 1,
        capacity: 1,
        equipment: ['Escritorio', 'Camilla', 'Estetoscopio'],
        clinicId: clinic5.id,
      },
    ],
    skipDuplicates: true,
  });

  // ========== DOCTOR 1 ==========
  const doctor1User = await prisma.user.upsert({
    where: { email: 'dr.ramirez@example.com' },
    update: {},
    create: {
      email: 'dr.ramirez@example.com',
      passwordHash: await bcrypt.hash(SEED_DOCTOR_PASSWORD, 10),
      dni: '44556677',
      firstName: 'Carlos',
      lastName: 'Ramírez Lopez',
      dayOfBirth: new Date('1980-03-12'),
      gender: 'MALE',
      role: 'DOCTOR',
      profileImage: 'profile-images/default-doctors/doctortv.webp',
    },
  });

  const doctor1 = await prisma.doctor.upsert({
    where: { cmp: 12345 },
    update: {},
    create: {
      cmp: 12345,
      userId: doctor1User.id,
      clinicId: clinic.id,
      specialtyId: medicinaGeneral.id,
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
      passwordHash: await bcrypt.hash(SEED_DOCTOR_PASSWORD, 10),
      dni: '99887766',
      firstName: 'María',
      lastName: 'Gómez Fernández',
      dayOfBirth: new Date('1985-07-22'),
      gender: 'FEMALE',
      role: 'DOCTOR',
      profileImage: 'profile-images/default-doctors/doctor5.webp',
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

  // ========== DOCTOR 3: Ginecóloga ==========
  const doctor3User = await prisma.user.upsert({
    where: { email: 'dra.fernandez@example.com' },
    update: {},
    create: {
      email: 'dra.fernandez@example.com',
      passwordHash: await bcrypt.hash(SEED_DOCTOR_PASSWORD, 10),
      dni: '11223344',
      firstName: 'Laura',
      lastName: 'Fernández Vega',
      dayOfBirth: new Date('1982-09-14'),
      gender: 'FEMALE',
      role: 'DOCTOR',
      profileImage: 'profile-images/default-doctors/doctor7.webp',
    },
  });

  const doctor3 = await prisma.doctor.upsert({
    where: { cmp: 11111 },
    update: {},
    create: {
      cmp: 11111,
      userId: doctor3User.id,
      clinicId: clinic2.id,
      specialtyId: ginecologia.id,
      yearsOfExperience: 12,
      consultationPrice: 140.0,
      rating: 4.8,
    },
  });

  // ========== DOCTOR 4: Traumatólogo ==========
  const doctor4User = await prisma.user.upsert({
    where: { email: 'dr.gonzalez@example.com' },
    update: {},
    create: {
      email: 'dr.gonzalez@example.com',
      passwordHash: await bcrypt.hash(SEED_DOCTOR_PASSWORD, 10),
      dni: '22334455',
      firstName: 'Miguel',
      lastName: 'González Ríos',
      dayOfBirth: new Date('1978-05-20'),
      gender: 'MALE',
      role: 'DOCTOR',
      profileImage: 'profile-images/default-doctors/doctor2.webp',
    },
  });

  const doctor4 = await prisma.doctor.upsert({
    where: { cmp: 22222 },
    update: {},
    create: {
      cmp: 22222,
      userId: doctor4User.id,
      clinicId: clinic4.id,
      specialtyId: traumatologia.id,
      yearsOfExperience: 18,
      consultationPrice: 160.0,
      rating: 4.6,
    },
  });

  // ========== DOCTOR 5: Dermatóloga ==========
  const doctor5User = await prisma.user.upsert({
    where: { email: 'dra.sanchez@example.com' },
    update: {},
    create: {
      email: 'dra.sanchez@example.com',
      passwordHash: await bcrypt.hash(SEED_DOCTOR_PASSWORD, 10),
      dni: '33445566',
      firstName: 'Patricia',
      lastName: 'Sánchez Morales',
      dayOfBirth: new Date('1987-01-08'),
      gender: 'FEMALE',
      role: 'DOCTOR',
      profileImage: 'profile-images/default-doctors/doctor8.webp',
    },
  });

  const doctor5 = await prisma.doctor.upsert({
    where: { cmp: 33333 },
    update: {},
    create: {
      cmp: 33333,
      userId: doctor5User.id,
      clinicId: clinic.id,
      specialtyId: dermatologia.id,
      yearsOfExperience: 8,
      consultationPrice: 130.0,
      rating: 4.3,
    },
  });

  // ========== DOCTOR 6: Oftalmólogo ==========
  const doctor6User = await prisma.user.upsert({
    where: { email: 'dr.herrera@example.com' },
    update: {},
    create: {
      email: 'dr.herrera@example.com',
      passwordHash: await bcrypt.hash(SEED_DOCTOR_PASSWORD, 10),
      dni: '55667788',
      firstName: 'Jorge',
      lastName: 'Herrera Castro',
      dayOfBirth: new Date('1975-11-22'),
      gender: 'MALE',
      role: 'DOCTOR',
      profileImage: 'profile-images/default-doctors/doctor3.webp',
    },
  });

  const doctor6 = await prisma.doctor.upsert({
    where: { cmp: 44444 },
    update: {},
    create: {
      cmp: 44444,
      userId: doctor6User.id,
      clinicId: clinic2.id,
      specialtyId: oftalmologia.id,
      yearsOfExperience: 20,
      consultationPrice: 150.0,
      rating: 4.9,
    },
  });

  // ========== DOCTOR 7: Neurólogo ==========
  const doctor7User = await prisma.user.upsert({
    where: { email: 'dr.mendoza@example.com' },
    update: {},
    create: {
      email: 'dr.mendoza@example.com',
      passwordHash: await bcrypt.hash(SEED_DOCTOR_PASSWORD, 10),
      dni: '66778899',
      firstName: 'Ricardo',
      lastName: 'Mendoza Silva',
      dayOfBirth: new Date('1980-04-15'),
      gender: 'MALE',
      role: 'DOCTOR',
      profileImage: 'profile-images/default-doctors/doctor1.webp',
    },
  });

  const doctor7 = await prisma.doctor.upsert({
    where: { cmp: 55555 },
    update: {},
    create: {
      cmp: 55555,
      userId: doctor7User.id,
      clinicId: clinic4.id,
      specialtyId: neurologia.id,
      yearsOfExperience: 16,
      consultationPrice: 180.0,
      rating: 4.7,
    },
  });

  // ========== DOCTOR 8: Psiquiatra ==========
  const doctor8User = await prisma.user.upsert({
    where: { email: 'dra.ortiz@example.com' },
    update: {},
    create: {
      email: 'dra.ortiz@example.com',
      passwordHash: await bcrypt.hash(SEED_DOCTOR_PASSWORD, 10),
      dni: '77889900',
      firstName: 'Elena',
      lastName: 'Ortiz Paredes',
      dayOfBirth: new Date('1984-07-30'),
      gender: 'FEMALE',
      role: 'DOCTOR',
      profileImage: 'profile-images/default-doctors/doctor6.webp',
    },
  });

  const doctor8 = await prisma.doctor.upsert({
    where: { cmp: 66666 },
    update: {},
    create: {
      cmp: 66666,
      userId: doctor8User.id,
      clinicId: clinic.id,
      specialtyId: psiquiatria.id,
      yearsOfExperience: 11,
      consultationPrice: 170.0,
      rating: 4.5,
    },
  });

  // ========== DOCTOR 9: Otorrinolaringólogo ==========
  const doctor9User = await prisma.user.upsert({
    where: { email: 'dr.vargas@example.com' },
    update: {},
    create: {
      email: 'dr.vargas@example.com',
      passwordHash: await bcrypt.hash(SEED_DOCTOR_PASSWORD, 10),
      dni: '88990011',
      firstName: 'Andrés',
      lastName: 'Vargas Luna',
      dayOfBirth: new Date('1979-12-05'),
      gender: 'MALE',
      role: 'DOCTOR',
      profileImage: 'profile-images/default-doctors/doctor9.webp',
    },
  });

  const doctor9 = await prisma.doctor.upsert({
    where: { cmp: 77777 },
    update: {},
    create: {
      cmp: 77777,
      userId: doctor9User.id,
      clinicId: clinic5.id,
      specialtyId: otorrinolaringologia.id,
      yearsOfExperience: 14,
      consultationPrice: 125.0,
      rating: 4.4,
    },
  });

  // ========== DOCTOR 10: Urólogo ==========
  const doctor10User = await prisma.user.upsert({
    where: { email: 'dr.castro@example.com' },
    update: {},
    create: {
      email: 'dr.castro@example.com',
      passwordHash: await bcrypt.hash(SEED_DOCTOR_PASSWORD, 10),
      dni: '99001122',
      firstName: 'Fernando',
      lastName: 'Castro Medina',
      dayOfBirth: new Date('1981-02-28'),
      gender: 'MALE',
      role: 'DOCTOR',
      profileImage: 'profile-images/default-doctors/doctor10.webp',
    },
  });

  const doctor10 = await prisma.doctor.upsert({
    where: { cmp: 88888 },
    update: {},
    create: {
      cmp: 88888,
      userId: doctor10User.id,
      clinicId: clinic4.id,
      specialtyId: urologia.id,
      yearsOfExperience: 13,
      consultationPrice: 155.0,
      rating: 4.6,
    },
  });

  // ========== DOCTOR 11: Endocrinóloga ==========
  const doctor11User = await prisma.user.upsert({
    where: { email: 'dra.rojas@example.com' },
    update: {},
    create: {
      email: 'dra.rojas@example.com',
      passwordHash: await bcrypt.hash(SEED_DOCTOR_PASSWORD, 10),
      dni: '10111213',
      firstName: 'Daniela',
      lastName: 'Rojas Torres',
      dayOfBirth: new Date('1986-08-17'),
      gender: 'FEMALE',
      role: 'DOCTOR',
    },
  });

  const doctor11 = await prisma.doctor.upsert({
    where: { cmp: 99999 },
    update: {},
    create: {
      cmp: 99999,
      userId: doctor11User.id,
      clinicId: clinic2.id,
      specialtyId: endocrinologia.id,
      yearsOfExperience: 9,
      consultationPrice: 145.0,
      rating: 4.7,
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

  await prisma.schedule.create({
    data: {
      dayOfWeek: 3, // Miércoles
      startTime: '14:00',
      endTime: '18:00',
      slotMinutes: 30,
      doctorId: doctor2.id,
    },
  });

  await prisma.schedule.create({
    data: {
      dayOfWeek: 5, // Viernes
      startTime: '09:00',
      endTime: '13:00',
      slotMinutes: 30,
      doctorId: doctor1.id,
    },
  });

  // Schedules para Doctor 3 (Ginecóloga)
  await prisma.schedule.create({
    data: {
      dayOfWeek: 2, // Martes
      startTime: '10:00',
      endTime: '14:00',
      slotMinutes: 45,
      doctorId: doctor3.id,
    },
  });

  await prisma.schedule.create({
    data: {
      dayOfWeek: 4, // Jueves
      startTime: '15:00',
      endTime: '19:00',
      slotMinutes: 45,
      doctorId: doctor3.id,
    },
  });

  // Schedules para Doctor 4 (Traumatólogo)
  await prisma.schedule.create({
    data: {
      dayOfWeek: 1, // Lunes
      startTime: '14:00',
      endTime: '18:00',
      slotMinutes: 30,
      doctorId: doctor4.id,
    },
  });

  await prisma.schedule.create({
    data: {
      dayOfWeek: 3, // Miércoles
      startTime: '09:00',
      endTime: '13:00',
      slotMinutes: 30,
      doctorId: doctor4.id,
    },
  });

  // Schedules para Doctor 5 (Dermatóloga)
  await prisma.schedule.create({
    data: {
      dayOfWeek: 2, // Martes
      startTime: '08:00',
      endTime: '12:00',
      slotMinutes: 30,
      doctorId: doctor5.id,
    },
  });

  await prisma.schedule.create({
    data: {
      dayOfWeek: 5, // Viernes
      startTime: '14:00',
      endTime: '18:00',
      slotMinutes: 30,
      doctorId: doctor5.id,
    },
  });

  // Schedules para Doctor 6 (Oftalmólogo)
  await prisma.schedule.create({
    data: {
      dayOfWeek: 1, // Lunes
      startTime: '09:00',
      endTime: '13:00',
      slotMinutes: 20,
      doctorId: doctor6.id,
    },
  });

  await prisma.schedule.create({
    data: {
      dayOfWeek: 4, // Jueves
      startTime: '10:00',
      endTime: '14:00',
      slotMinutes: 20,
      doctorId: doctor6.id,
    },
  });

  // Schedules para Doctor 7 (Neurólogo)
  await prisma.schedule.create({
    data: {
      dayOfWeek: 2, // Martes
      startTime: '15:00',
      endTime: '19:00',
      slotMinutes: 60,
      doctorId: doctor7.id,
    },
  });

  // Schedules para Doctor 8 (Psiquiatra)
  await prisma.schedule.create({
    data: {
      dayOfWeek: 3, // Miércoles
      startTime: '10:00',
      endTime: '14:00',
      slotMinutes: 60,
      doctorId: doctor8.id,
    },
  });

  await prisma.schedule.create({
    data: {
      dayOfWeek: 5, // Viernes
      startTime: '10:00',
      endTime: '14:00',
      slotMinutes: 60,
      doctorId: doctor8.id,
    },
  });

  // Schedules para Doctor 9 (Otorrinolaringólogo)
  await prisma.schedule.create({
    data: {
      dayOfWeek: 1, // Lunes
      startTime: '16:00',
      endTime: '20:00',
      slotMinutes: 30,
      doctorId: doctor9.id,
    },
  });

  // Schedules para Doctor 10 (Urólogo)
  await prisma.schedule.create({
    data: {
      dayOfWeek: 2, // Martes
      startTime: '08:00',
      endTime: '12:00',
      slotMinutes: 40,
      doctorId: doctor10.id,
    },
  });

  await prisma.schedule.create({
    data: {
      dayOfWeek: 4, // Jueves
      startTime: '14:00',
      endTime: '18:00',
      slotMinutes: 40,
      doctorId: doctor10.id,
    },
  });

  // Schedules para Doctor 11 (Endocrinóloga)
  await prisma.schedule.create({
    data: {
      dayOfWeek: 3, // Miércoles
      startTime: '08:00',
      endTime: '12:00',
      slotMinutes: 45,
      doctorId: doctor11.id,
    },
  });

  await prisma.schedule.create({
    data: {
      dayOfWeek: 5, // Viernes
      startTime: '15:00',
      endTime: '19:00',
      slotMinutes: 45,
      doctorId: doctor11.id,
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

  // Obtener más slots para crear más citas
  const allSlots = await prisma.slot.findMany({
    where: { status: 'FREE' },
    take: 50,
    orderBy: { startAt: 'asc' },
  });

  // Appointment 2: Patient2 - Doctor2 (CONFIRMED)
  if (allSlots[0]) {
    await prisma.appointment.create({
      data: {
        userId: patient2.id,
        doctorId: doctor2.id,
        slotId: allSlots[0].id,
        status: 'CONFIRMED',
        reason: 'Control pediátrico',
        notes: 'Vacunación pendiente',
        confirmedAt: new Date(),
      },
    });
    await prisma.slot.update({
      where: { id: allSlots[0].id },
      data: { status: 'BOOKED' },
    });
  }

  // Appointment 3: Patient3 - Doctor3 (ATTENDED)
  if (allSlots[1]) {
    await prisma.appointment.create({
      data: {
        userId: patient3.id,
        doctorId: doctor3.id,
        slotId: allSlots[1].id,
        status: 'ATTENDED',
        reason: 'Consulta ginecológica',
        notes: 'Examen de rutina realizado',
        confirmedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        attendedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.slot.update({
      where: { id: allSlots[1].id },
      data: { status: 'BOOKED' },
    });
  }

  // Appointment 4: Patient4 - Doctor4 (CANCELLED)
  if (allSlots[2]) {
    await prisma.appointment.create({
      data: {
        userId: patient4.id,
        doctorId: doctor4.id,
        slotId: allSlots[2].id,
        status: 'CANCELLED',
        reason: 'Dolor en rodilla',
        notes: 'Paciente canceló por motivos personales',
        cancelledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.slot.update({
      where: { id: allSlots[2].id },
      data: { status: 'FREE' },
    });
  }

  // Appointment 5: Patient5 - Doctor5 (PENDING)
  if (allSlots[3]) {
    await prisma.appointment.create({
      data: {
        userId: patient5.id,
        doctorId: doctor5.id,
        slotId: allSlots[3].id,
        status: 'PENDING',
        reason: 'Problema dermatológico',
        notes: 'Consulta por acné severo',
      },
    });
    await prisma.slot.update({
      where: { id: allSlots[3].id },
      data: { status: 'HELD' },
    });
  }

  // Appointment 6: Patient6 - Doctor6 (CONFIRMED)
  if (allSlots[4]) {
    await prisma.appointment.create({
      data: {
        userId: patient6.id,
        doctorId: doctor6.id,
        slotId: allSlots[4].id,
        status: 'CONFIRMED',
        reason: 'Revisión de vista',
        notes: 'Paciente reporta visión borrosa',
        confirmedAt: new Date(),
      },
    });
    await prisma.slot.update({
      where: { id: allSlots[4].id },
      data: { status: 'BOOKED' },
    });
  }

  // Appointment 7: Patient7 - Doctor7 (NO_SHOW)
  if (allSlots[5]) {
    await prisma.appointment.create({
      data: {
        userId: patient7.id,
        doctorId: doctor7.id,
        slotId: allSlots[5].id,
        status: 'NO_SHOW',
        reason: 'Consulta neurológica',
        notes: 'Paciente no se presentó a la cita',
        confirmedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.slot.update({
      where: { id: allSlots[5].id },
      data: { status: 'BOOKED' },
    });
  }

  // Appointment 8: Patient8 - Doctor8 (CONFIRMED)
  if (allSlots[6]) {
    await prisma.appointment.create({
      data: {
        userId: patient8.id,
        doctorId: doctor8.id,
        slotId: allSlots[6].id,
        status: 'CONFIRMED',
        reason: 'Consulta psiquiátrica',
        notes: 'Primera consulta por ansiedad',
        confirmedAt: new Date(),
      },
    });
    await prisma.slot.update({
      where: { id: allSlots[6].id },
      data: { status: 'BOOKED' },
    });
  }

  // Appointment 9: Patient2 - Doctor9 (ATTENDED)
  if (allSlots[7]) {
    await prisma.appointment.create({
      data: {
        userId: patient2.id,
        doctorId: doctor9.id,
        slotId: allSlots[7].id,
        status: 'ATTENDED',
        reason: 'Dolor de oído',
        notes: 'Infección tratada con antibióticos',
        confirmedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        attendedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.slot.update({
      where: { id: allSlots[7].id },
      data: { status: 'BOOKED' },
    });
  }

  // Appointment 10: Patient3 - Doctor10 (CONFIRMED)
  if (allSlots[8]) {
    await prisma.appointment.create({
      data: {
        userId: patient3.id,
        doctorId: doctor10.id,
        slotId: allSlots[8].id,
        status: 'CONFIRMED',
        reason: 'Consulta urológica',
        notes: 'Evaluación preventiva',
        confirmedAt: new Date(),
      },
    });
    await prisma.slot.update({
      where: { id: allSlots[8].id },
      data: { status: 'BOOKED' },
    });
  }

  // Appointment 11: Patient4 - Doctor11 (PENDING)
  if (allSlots[9]) {
    await prisma.appointment.create({
      data: {
        userId: patient4.id,
        doctorId: doctor11.id,
        slotId: allSlots[9].id,
        status: 'PENDING',
        reason: 'Control de diabetes',
        notes: 'Ajuste de tratamiento',
      },
    });
    await prisma.slot.update({
      where: { id: allSlots[9].id },
      data: { status: 'HELD' },
    });
  }

  // Appointment 12: Patient5 - Doctor1 (ATTENDED)
  if (allSlots[10]) {
    await prisma.appointment.create({
      data: {
        userId: patient5.id,
        doctorId: doctor1.id,
        slotId: allSlots[10].id,
        status: 'ATTENDED',
        reason: 'Chequeo cardíaco',
        notes: 'Electrocardiograma normal',
        confirmedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        attendedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.slot.update({
      where: { id: allSlots[10].id },
      data: { status: 'BOOKED' },
    });
  }

  // Appointment 13: Patient6 - Doctor2 (CANCELLED)
  if (allSlots[11]) {
    await prisma.appointment.create({
      data: {
        userId: patient6.id,
        doctorId: doctor2.id,
        slotId: allSlots[11].id,
        status: 'CANCELLED',
        reason: 'Vacunación infantil',
        notes: 'Cancelado por el doctor',
        cancelledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.slot.update({
      where: { id: allSlots[11].id },
      data: { status: 'FREE' },
    });
  }

  // Appointment 14: Patient7 - Doctor3 (CONFIRMED)
  if (allSlots[12]) {
    await prisma.appointment.create({
      data: {
        userId: patient7.id,
        doctorId: doctor3.id,
        slotId: allSlots[12].id,
        status: 'CONFIRMED',
        reason: 'Ecografía',
        notes: 'Estudio programado',
        confirmedAt: new Date(),
      },
    });
    await prisma.slot.update({
      where: { id: allSlots[12].id },
      data: { status: 'BOOKED' },
    });
  }

  // Appointment 15: Patient8 - Doctor4 (ATTENDED)
  if (allSlots[13]) {
    await prisma.appointment.create({
      data: {
        userId: patient8.id,
        doctorId: doctor4.id,
        slotId: allSlots[13].id,
        status: 'ATTENDED',
        reason: 'Esguince de tobillo',
        notes: 'Tratamiento fisioterapéutico indicado',
        confirmedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        attendedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.slot.update({
      where: { id: allSlots[13].id },
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

  await prisma.doctorUnavailability.create({
    data: {
      doctorId: doctor1.id,
      startAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      reason: 'Vacaciones programadas',
    },
  });

  await prisma.doctorUnavailability.create({
    data: {
      doctorId: doctor4.id,
      startAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      reason: 'Conferencia internacional',
    },
  });

  await prisma.doctorUnavailability.create({
    data: {
      doctorId: doctor7.id,
      startAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      reason: 'Capacitación especializada',
    },
  });

  // ====================== EMAIL MESSAGES ======================
  await prisma.emailMessage.createMany({
    data: [
      {
        to: patient?.email || 'patient@example.com',
        subject: 'Confirmación de cita médica',
        template: 'BOOKING_CONFIRMATION',
        variables: {
          patientName: patient
            ? `${patient.firstName} ${patient.lastName}`
            : 'Juan Pérez',
          doctorName: 'Dr. Carlos Ramírez',
          date: new Date().toISOString(),
          specialty: 'Cardiología',
        },
        status: 'SENT',
        attempts: 1,
        sentAt: new Date(),
      },
      {
        to: patient2.email,
        subject: 'Confirmación de cita médica',
        template: 'BOOKING_CONFIRMATION',
        variables: {
          patientName: `${patient2.firstName} ${patient2.lastName}`,
          doctorName: 'Dra. María Gómez',
          date: new Date().toISOString(),
          specialty: 'Pediatría',
        },
        status: 'SENT',
        attempts: 1,
        sentAt: new Date(),
      },
      {
        to: patient4.email,
        subject: 'Cancelación de cita médica',
        template: 'BOOKING_CANCELLATION',
        variables: {
          patientName: `${patient4.firstName} ${patient4.lastName}`,
          doctorName: 'Dr. Miguel González',
          date: new Date().toISOString(),
          reason: 'Motivos personales',
        },
        status: 'SENT',
        attempts: 1,
        sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        to: patient5.email,
        subject: 'Recordatorio de cita médica',
        template: 'BOOKING_REMINDER',
        variables: {
          patientName: `${patient5.firstName} ${patient5.lastName}`,
          doctorName: 'Dra. Patricia Sánchez',
          date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          specialty: 'Dermatología',
        },
        status: 'PENDING',
        attempts: 0,
      },
      {
        to: patient6.email,
        subject: 'Confirmación de cita médica',
        template: 'BOOKING_CONFIRMATION',
        variables: {
          patientName: `${patient6.firstName} ${patient6.lastName}`,
          doctorName: 'Dr. Jorge Herrera',
          date: new Date().toISOString(),
          specialty: 'Oftalmología',
        },
        status: 'SENT',
        attempts: 1,
        sentAt: new Date(),
      },
      {
        to: patient7.email,
        subject: 'Ausencia en cita médica',
        template: 'BOOKING_REMINDER',
        variables: {
          patientName: `${patient7.firstName} ${patient7.lastName}`,
          doctorName: 'Dr. Ricardo Mendoza',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          specialty: 'Neurología',
        },
        status: 'FAILED',
        attempts: 3,
        lastError: 'Email address not reachable',
      },
      {
        to: patient8.email,
        subject: 'Confirmación de cita médica',
        template: 'BOOKING_CONFIRMATION',
        variables: {
          patientName: `${patient8.firstName} ${patient8.lastName}`,
          doctorName: 'Dra. Elena Ortiz',
          date: new Date().toISOString(),
          specialty: 'Psiquiatría',
        },
        status: 'SENT',
        attempts: 1,
        sentAt: new Date(),
      },
      {
        to: patient3.email,
        subject: 'Recordatorio de cita médica',
        template: 'BOOKING_REMINDER',
        variables: {
          patientName: `${patient3.firstName} ${patient3.lastName}`,
          doctorName: 'Dr. Fernando Castro',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          specialty: 'Urología',
        },
        status: 'RETRYING',
        attempts: 2,
        lastError: 'Temporary server error',
      },
      {
        to: 'admin@example.com',
        subject: 'Bienvenido a Clínica Perú',
        template: 'WELCOME',
        variables: {
          userName: 'Admin',
          loginUrl: 'https://clinicaperu.com/login',
        },
        status: 'SENT',
        attempts: 1,
        sentAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        to: patient?.email || 'patient@example.com',
        subject: 'Recuperación de contraseña',
        template: 'PASSWORD_RESET',
        variables: {
          userName: patient?.firstName || 'Juan',
          resetLink: 'https://clinicaperu.com/reset-password?token=abc123',
          expiresIn: '24 horas',
        },
        status: 'SENT',
        attempts: 1,
        sentAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Múltiples citas creadas con diferentes estados');
  console.log('✅ Indisponibilidades de doctores registradas');
  console.log('✅ Mensajes de email generados');

  // ====================== MEDICAL RECORDS ======================
  // Obtener citas ATTENDED para crear expedientes médicos
  const attendedAppointments = await prisma.appointment.findMany({
    where: { status: 'ATTENDED' },
    include: {
      doctor: {
        include: {
          user: true,
        },
      },
      user: true,
    },
  });

  console.log(
    `📋 Creando expedientes médicos para ${attendedAppointments.length} citas atendidas...`,
  );

  // Medical Record 1: Consulta ginecológica (Patient3 - Doctor3)
  if (attendedAppointments[0]) {
    const record1 = await prisma.medicalRecord.create({
      data: {
        appointmentId: attendedAppointments[0].id,
        recordType: 'CONSULTATION',
        diagnosis:
          'Examen ginecológico de rutina normal. No se detectaron anomalías.',
        prescription:
          'Continuar con controles anuales. Suplemento de ácido fólico 400mcg diario.',
        notes:
          'Paciente en buen estado general. Última citología hace 1 año con resultados normales. Se recomienda mantener hábitos saludables.',
        vitalSigns: {
          bloodPressure: '120/80',
          heartRate: 72,
          temperature: 36.5,
          weight: 65,
          height: 165,
        },
        attachments: [],
        createdById: attendedAppointments[0].doctor.userId,
      },
    });

    // Access log para creación
    await prisma.medicalRecordAccessLog.create({
      data: {
        recordId: record1.id,
        userId: attendedAppointments[0].doctor.userId,
        action: 'CREATE',
        metadata: {
          recordType: 'CONSULTATION',
          appointmentId: attendedAppointments[0].id,
        },
      },
    });

    // Access log para visualización por el paciente
    await prisma.medicalRecordAccessLog.create({
      data: {
        recordId: record1.id,
        userId: attendedAppointments[0].userId,
        action: 'VIEW',
        metadata: {
          viewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      },
    });
  }

  // Medical Record 2: Dolor de oído (Patient2 - Doctor9)
  if (attendedAppointments[1]) {
    const record2 = await prisma.medicalRecord.create({
      data: {
        appointmentId: attendedAppointments[1].id,
        recordType: 'CONSULTATION',
        diagnosis:
          'Otitis media aguda del oído derecho. Infección bacteriana leve.',
        prescription:
          'Amoxicilina 500mg cada 8 horas por 7 días. Ibuprofeno 400mg cada 8 horas si hay dolor. Gotas óticas con ciprofloxacino 3 gotas cada 12 horas.',
        notes:
          'Paciente refiere dolor intenso en oído derecho desde hace 3 días. Tímpano inflamado con secreción purulenta. Se indica reposo relativo y evitar mojar el oído. Control en 7 días.',
        vitalSigns: {
          bloodPressure: '115/75',
          heartRate: 78,
          temperature: 37.8,
          weight: 58,
          height: 160,
        },
        attachments: [],
        createdById: attendedAppointments[1].doctor.userId,
      },
    });

    await prisma.medicalRecordAccessLog.create({
      data: {
        recordId: record2.id,
        userId: attendedAppointments[1].doctor.userId,
        action: 'CREATE',
        metadata: {
          recordType: 'CONSULTATION',
          appointmentId: attendedAppointments[1].id,
        },
      },
    });

    await prisma.medicalRecordAccessLog.create({
      data: {
        recordId: record2.id,
        userId: attendedAppointments[1].userId,
        action: 'VIEW',
        metadata: {
          viewedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        },
      },
    });
  }

  // Medical Record 3: Chequeo cardíaco (Patient5 - Doctor1)
  if (attendedAppointments[2]) {
    const record3 = await prisma.medicalRecord.create({
      data: {
        appointmentId: attendedAppointments[2].id,
        recordType: 'FOLLOW_UP',
        diagnosis:
          'Control cardiológico. Electrocardiograma dentro de parámetros normales. Presión arterial controlada.',
        prescription:
          'Continuar con Enalapril 10mg una vez al día. Atorvastatina 20mg por la noche. Dieta baja en sodio.',
        notes:
          'Paciente con antecedentes de hipertensión arterial controlada. ECG muestra ritmo sinusal normal. No se detectan soplos cardíacos. Colesterol total: 180 mg/dL, LDL: 110 mg/dL, HDL: 55 mg/dL. Se recomienda ejercicio moderado 30 minutos diarios. Próximo control en 6 meses.',
        vitalSigns: {
          bloodPressure: '130/85',
          heartRate: 68,
          temperature: 36.7,
          weight: 82,
          height: 175,
        },
        attachments: [
          {
            key: 'medical-records/fake-record-3/ecg-report.pdf',
            name: 'Electrocardiograma.pdf',
            uploadedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
            size: 245680,
          },
        ],
        createdById: attendedAppointments[2].doctor.userId,
      },
    });

    await prisma.medicalRecordAccessLog.createMany({
      data: [
        {
          recordId: record3.id,
          userId: attendedAppointments[2].doctor.userId,
          action: 'CREATE',
          metadata: {
            recordType: 'FOLLOW_UP',
            appointmentId: attendedAppointments[2].id,
          },
        },
        {
          recordId: record3.id,
          userId: attendedAppointments[2].doctor.userId,
          action: 'UPLOAD_FILE',
          metadata: {
            fileName: 'Electrocardiograma.pdf',
            fileSize: 245680,
          },
        },
        {
          recordId: record3.id,
          userId: attendedAppointments[2].userId,
          action: 'VIEW',
          metadata: {
            viewedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
        },
        {
          recordId: record3.id,
          userId: attendedAppointments[2].userId,
          action: 'DOWNLOAD_FILE',
          metadata: {
            fileName: 'Electrocardiograma.pdf',
          },
        },
      ],
    });
  }

  // Medical Record 4: Esguince de tobillo (Patient8 - Doctor4)
  if (attendedAppointments[3]) {
    const record4 = await prisma.medicalRecord.create({
      data: {
        appointmentId: attendedAppointments[3].id,
        recordType: 'EMERGENCY',
        diagnosis:
          'Esguince de tobillo derecho grado II. Ligamento peroneoastragalino anterior parcialmente lesionado.',
        prescription:
          'Reposo relativo 2 semanas. Hielo local 20 minutos cada 4 horas primeros 3 días. Vendaje compresivo. Diclofenaco 50mg cada 12 horas por 5 días. Fisioterapia después de 1 semana.',
        notes:
          'Paciente sufrió caída jugando fútbol hace 2 horas. Tobillo inflamado con equimosis lateral. Dolor intenso a la palpación. Radiografía descarta fractura. Se indica uso de muletas por 1 semana. Elevación del miembro afectado. Control con traumatología en 10 días.',
        vitalSigns: {
          bloodPressure: '125/80',
          heartRate: 85,
          temperature: 36.8,
          weight: 62,
          height: 158,
        },
        attachments: [
          {
            key: 'medical-records/fake-record-4/radiografia-tobillo.jpg',
            name: 'Radiografía Tobillo Derecho.jpg',
            uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            size: 1024000,
          },
          {
            key: 'medical-records/fake-record-4/plan-fisioterapia.pdf',
            name: 'Plan de Fisioterapia.pdf',
            uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            size: 156789,
          },
        ],
        createdById: attendedAppointments[3].doctor.userId,
      },
    });

    await prisma.medicalRecordAccessLog.createMany({
      data: [
        {
          recordId: record4.id,
          userId: attendedAppointments[3].doctor.userId,
          action: 'CREATE',
          metadata: {
            recordType: 'EMERGENCY',
            appointmentId: attendedAppointments[3].id,
          },
        },
        {
          recordId: record4.id,
          userId: attendedAppointments[3].doctor.userId,
          action: 'UPLOAD_FILE',
          metadata: {
            fileName: 'Radiografía Tobillo Derecho.jpg',
            fileSize: 1024000,
          },
        },
        {
          recordId: record4.id,
          userId: attendedAppointments[3].doctor.userId,
          action: 'UPLOAD_FILE',
          metadata: {
            fileName: 'Plan de Fisioterapia.pdf',
            fileSize: 156789,
          },
        },
        {
          recordId: record4.id,
          userId: attendedAppointments[3].userId,
          action: 'VIEW',
          metadata: {
            viewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
        },
        {
          recordId: record4.id,
          userId: attendedAppointments[3].userId,
          action: 'DOWNLOAD_FILE',
          metadata: {
            fileName: 'Radiografía Tobillo Derecho.jpg',
          },
        },
        {
          recordId: record4.id,
          userId: attendedAppointments[3].userId,
          action: 'DOWNLOAD_FILE',
          metadata: {
            fileName: 'Plan de Fisioterapia.pdf',
          },
        },
      ],
    });
  }

  console.log(
    '✅ Expedientes médicos creados con diagnósticos, prescripciones y archivos adjuntos',
  );
  console.log(
    '✅ Logs de acceso registrados para auditoría (CREATE, VIEW, UPLOAD_FILE, DOWNLOAD_FILE)',
  );

  // ====================== PAYMENTS ======================
  // Crear pagos para algunas citas confirmadas y atendidas
  const paidAppointments = await prisma.appointment.findMany({
    where: {
      OR: [{ status: 'CONFIRMED' }, { status: 'ATTENDED' }],
    },
    include: {
      doctor: {
        include: {
          user: true,
          specialty: true,
        },
      },
      user: true,
      slot: true,
    },
    take: 8,
  });

  console.log(`💳 Creando pagos para ${paidAppointments.length} citas...`);

  for (let i = 0; i < paidAppointments.length; i++) {
    const apt = paidAppointments[i];
    const isCompleted = i % 3 !== 0; // 2 de cada 3 pagos completados
    const isPending = i % 3 === 0;

    await prisma.payment.create({
      data: {
        appointmentId: apt.id,
        amount: apt.doctor.consultationPrice || 100,
        currency: 'PEN',
        paymentMethod: i % 2 === 0 ? 'SIMULATED_CARD' : 'CASH_AT_CLINIC',
        status: isPending ? 'PENDING' : 'COMPLETED',
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substring(7)}-${i}`,
        metadata: {
          patientName: `${apt.user.firstName} ${apt.user.lastName}`,
          doctorName: `Dr(a). ${apt.doctor.user?.firstName || 'Doctor'}`,
          specialty: apt.doctor.specialty?.name || 'Consulta General',
          appointmentDate: apt.slot?.startAt || new Date(),
        },
        paidAt: isCompleted
          ? new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000)
          : undefined,
      },
    });
  }

  console.log('✅ Pagos creados con diferentes estados (COMPLETED, PENDING)');
}

void main()
  .then(() => {
    console.log(
      '✅ Seed ejecutado con éxito: Clínica San Pablo Perú inicializada',
    );
  })
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
