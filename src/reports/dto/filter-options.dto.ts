import { ApiProperty } from '@nestjs/swagger';

export class FilterOptionDto {
  @ApiProperty({ description: 'Option ID' })
  id: string;

  @ApiProperty({ description: 'Option name/label' })
  name: string;
}

export class FilterOptionsDto {
  @ApiProperty({ description: 'List of doctors', type: [FilterOptionDto] })
  doctors: FilterOptionDto[];

  @ApiProperty({ description: 'List of specialties', type: [FilterOptionDto] })
  specialties: FilterOptionDto[];

  @ApiProperty({ description: 'List of appointment statuses' })
  appointmentStatuses: string[];

  @ApiProperty({ description: 'List of payment methods' })
  paymentMethods: string[];
}
