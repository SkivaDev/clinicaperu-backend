import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); //COMANDO: npx ts-node prisma/seed.ts

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: {
      email: 'admin@example.com',
    },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
      dni: '12345678',
      names: 'Admin',
      fatherSurname: 'Admin',
      motherSurname: 'Admin',
      dayOfBirth: new Date(),
      gender: 'MALE',
    },
  });

  const patientPassword = await bcrypt.hash('patient123', 10);

  await prisma.user.upsert({
    where: {
      email: 'patient@example.com',
    },
    update: {},
    create: {
      email: 'patient@example.com',
      passwordHash: patientPassword,
      role: 'PATIENT',
      dni: '78563248',
      names: 'Patient',
      fatherSurname: 'Patient',
      motherSurname: 'Patient',
      dayOfBirth: new Date(),
      gender: 'MALE',
    },
  });
}

main()
  .then(() => {
    console.log('Seed ejecutado ✅');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
