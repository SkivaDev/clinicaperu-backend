// import { ApiProperty } from '@nestjs/swagger';

import { Doctor, Room } from '@prisma/client';

export class ClinicResponseDto {
  id: string;

  name: string;

  address: string;

  ubigeoDept: string;

  ubigeoProv: string;

  ubigeoDist: string;

  phone: string | null;

  email: string | null;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;

  rooms?: Room[];

  doctors?: Doctor[];
}
