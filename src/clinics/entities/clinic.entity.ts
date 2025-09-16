import { Prisma } from '@prisma/client';

// Clinic con rooms y doctors
export type ClinicWithRelations = Prisma.ClinicGetPayload<{
  include: { rooms: true; doctors: true };
}>;
