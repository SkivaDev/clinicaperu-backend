import { ApiProperty } from '@nestjs/swagger';

export class RevenueChartDataPointDto {
  @ApiProperty({ description: 'Period name (e.g., "Ene", "Feb")' })
  name: string;

  @ApiProperty({ description: 'Total revenue for the period' })
  total: number;
}

export class RevenueChartDto {
  @ApiProperty({ description: 'Revenue data points', type: [RevenueChartDataPointDto] })
  data: RevenueChartDataPointDto[];
}
