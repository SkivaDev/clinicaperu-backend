import { Gender, Role } from '@prisma/client';

export class DoctorDetailDto {
  id: string;
  cmp: string;

  user: {
    id: string;
    dni: string;
    names: string;
    fatherSurname: string;
    motherSurname: string;
    dayOfBirth: Date;
    phone: string | null;
    gender: Gender;
    email: string;
    role: Role;
    isActive: boolean;
  };

  clinic: {
    id: string;
    name: string;
    address: string;
  };

  specialty: {
    id: string;
    name: string;
  };
}
