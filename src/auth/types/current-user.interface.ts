import { Role } from '@prisma/client';

export interface CurrentUserPayload {
  userId: string;
  dni: string;
  role: Role;
  email?: string; // opcional si lo incluyes en el JWT
  firstName?: string; // opcional
  lastName?: string; // opcional
}
