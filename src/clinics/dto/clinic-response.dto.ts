// import { ApiProperty } from '@nestjs/swagger';

import { Doctor, Room } from '@prisma/client';

export class ClinicResponseDto {
  //   @ApiProperty()
  id: string;

  //   @ApiProperty()
  name: string;

  //   @ApiProperty()
  address: string;

  //   @ApiProperty({ required: false })
  ubigeoDept: string | null;

  //   @ApiProperty({ required: false })
  ubigeoProv: string | null;

  //   @ApiProperty({ required: false })
  ubigeoDist: string | null;

  //   @ApiProperty({ required: false })
  phone: string | null;

  //   @ApiProperty({ type: () => [String] })
  rooms?: Room[];

  //   @ApiProperty({ type: () => [String] })
  doctors?: Doctor[];

  constructor(partial: Partial<ClinicResponseDto>) {
    Object.assign(this, partial);
  }
}
