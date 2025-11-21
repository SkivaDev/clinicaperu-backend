import { ApiProperty } from '@nestjs/swagger';

export class KPIMetricDto {
  @ApiProperty({ description: 'Current value of the metric' })
  value: number;

  @ApiProperty({ description: 'Growth percentage compared to previous period' })
  growth: number;

  @ApiProperty({ description: 'Whether the growth is positive' })
  isPositive: boolean;

  @ApiProperty({ description: 'Description of the metric' })
  description?: string;
}

export class KPIResponseDto {
  @ApiProperty({ description: 'Total revenue metric', type: KPIMetricDto })
  totalRevenue: KPIMetricDto;

  @ApiProperty({ description: 'Total appointments metric', type: KPIMetricDto })
  totalAppointments: KPIMetricDto;

  @ApiProperty({ description: 'Occupancy rate metric', type: KPIMetricDto })
  occupancyRate: KPIMetricDto;

  @ApiProperty({ description: 'New patients metric', type: KPIMetricDto })
  newPatients: KPIMetricDto;

  @ApiProperty({ description: 'Average wait time metric', type: KPIMetricDto })
  avgWaitTime: KPIMetricDto;

  @ApiProperty({ description: 'Cancellation rate metric', type: KPIMetricDto })
  cancellationRate: KPIMetricDto;

  @ApiProperty({ description: 'Retention rate metric', type: KPIMetricDto })
  retentionRate: KPIMetricDto;

  @ApiProperty({ description: 'Active patients metric', type: KPIMetricDto })
  activePatients: KPIMetricDto;
}
