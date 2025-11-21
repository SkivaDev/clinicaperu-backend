import { ApiProperty } from '@nestjs/swagger';

export class AppointmentStatsDataDto {
  @ApiProperty({ description: 'Status name' })
  name: string;

  @ApiProperty({ description: 'Number of appointments' })
  value: number;

  @ApiProperty({ description: 'Color for the chart' })
  color: string;
}

export class AppointmentStatsDto {
  @ApiProperty({ description: 'Appointment statistics by status', type: [AppointmentStatsDataDto] })
  data: AppointmentStatsDataDto[];

  @ApiProperty({ description: 'Total number of appointments' })
  total: number;
}
