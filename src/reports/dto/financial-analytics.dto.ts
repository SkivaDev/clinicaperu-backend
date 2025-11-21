import { ApiProperty } from '@nestjs/swagger';

export class PaymentMethodDataDto {
  @ApiProperty({ description: 'Payment method name' })
  name: string;

  @ApiProperty({ description: 'Percentage of total payments' })
  value: number;

  @ApiProperty({ description: 'Total amount' })
  amount: number;

  @ApiProperty({ description: 'Color for the chart' })
  color: string;
}

export class RevenueBySpecialtyDto {
  @ApiProperty({ description: 'Specialty name' })
  name: string;

  @ApiProperty({ description: 'Total revenue' })
  value: number;
}

export class TopDoctorByRevenueDto {
  @ApiProperty({ description: 'Doctor name' })
  name: string;

  @ApiProperty({ description: 'Total revenue' })
  value: number;
}

export class ProjectionDataDto {
  @ApiProperty({ description: 'Month name' })
  month: string;

  @ApiProperty({ description: 'Actual revenue', nullable: true })
  actual: number | null;

  @ApiProperty({ description: 'Projected revenue' })
  projected: number;
}

export class FinancialAnalyticsDto {
  @ApiProperty({ description: 'Payment methods breakdown', type: [PaymentMethodDataDto] })
  paymentMethods: PaymentMethodDataDto[];

  @ApiProperty({ description: 'Revenue by specialty', type: [RevenueBySpecialtyDto] })
  revenueBySpecialty: RevenueBySpecialtyDto[];

  @ApiProperty({ description: 'Top doctors by revenue', type: [TopDoctorByRevenueDto] })
  topDoctorsByRevenue: TopDoctorByRevenueDto[];

  @ApiProperty({ description: 'Revenue projection data', type: [ProjectionDataDto] })
  projection: ProjectionDataDto[];
}
