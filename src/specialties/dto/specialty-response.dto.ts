import { Doctor } from '@prisma/client';

export class SpecialtyResponseDto {
  id: string;
  name: string;
  doctors?: Doctor[];
}
