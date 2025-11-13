import { Specialty } from '@prisma/client';

export class SpecialtyEntity implements Specialty {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}
