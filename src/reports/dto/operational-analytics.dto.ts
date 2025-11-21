import { ApiProperty } from '@nestjs/swagger';

export class HeatmapDataDto {
  @ApiProperty({ description: 'Hour of the day (e.g., "08:00")' })
  hour: string;

  @ApiProperty({ description: 'Monday occupancy percentage' })
  mon: number;

  @ApiProperty({ description: 'Tuesday occupancy percentage' })
  tue: number;

  @ApiProperty({ description: 'Wednesday occupancy percentage' })
  wed: number;

  @ApiProperty({ description: 'Thursday occupancy percentage' })
  thu: number;

  @ApiProperty({ description: 'Friday occupancy percentage' })
  fri: number;

  @ApiProperty({ description: 'Saturday occupancy percentage' })
  sat: number;
}

export class FunnelDataDto {
  @ApiProperty({ description: 'Stage name' })
  stage: string;

  @ApiProperty({ description: 'Number of appointments in this stage' })
  count: number;

  @ApiProperty({ description: 'Color for the chart' })
  fill: string;
}

export class CancellationTrendDto {
  @ApiProperty({ description: 'Day name (e.g., "Lun", "Mar")' })
  day: string;

  @ApiProperty({ description: 'Number of cancellations' })
  count: number;
}

export class OperationalAnalyticsDto {
  @ApiProperty({ description: 'Heatmap data by hour and day', type: [HeatmapDataDto] })
  heatmap: HeatmapDataDto[];

  @ApiProperty({ description: 'Funnel conversion data', type: [FunnelDataDto] })
  funnel: FunnelDataDto[];

  @ApiProperty({ description: 'Cancellation trend by day', type: [CancellationTrendDto] })
  cancellations: CancellationTrendDto[];
}
