import { Gender, Role } from '@prisma/client';

export class UserResponseDto {
  id: string;
  dni: string;
  email: string;
  names: string;
  fatherSurname: string;
  motherSurname: string;
  dayOfBirth: Date;
  phone: string | null;
  gender: Gender;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
