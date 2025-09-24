import { Doctor } from '@prisma/client';

export class SpecialtyResponseDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  doctors?: Doctor[];
}
