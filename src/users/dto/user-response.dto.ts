import { Gender, Role } from '@prisma/client';

export class UserResponseDto {
  id: string;
  dni: string;
  email: string;
  firstName: string;
  lastName: string;
  dayOfBirth: Date;
  phone: string | null;
  gender: Gender;
  role: Role;
  profileImage?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
