import { IsDateString, IsOptional, IsUUID, IsEnum, IsInt, Min, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryReportsDto {
  @ApiProperty({
    description: 'Start date for the report period',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for the report period',
    example: '2024-01-31T23:59:59.999Z',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Filter by doctor ID',
  })
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by specialty ID',
  })
  @IsOptional()
  @IsUUID()
  specialtyId?: string;

  @ApiPropertyOptional({
    description: 'Filter by clinic ID',
  })
  @IsOptional()
  @IsUUID()
  clinicId?: string;

  @ApiPropertyOptional({
    description: 'Filter by appointment status',
    enum: AppointmentStatus,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

export class TopDoctorsQueryDto extends QueryReportsDto {
  @ApiPropertyOptional({
    description: 'Number of top doctors to return',
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['patients', 'revenue', 'rating'],
    default: 'patients',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'patients' | 'revenue' | 'rating' = 'patients';
}

export class RevenueChartQueryDto extends QueryReportsDto {
  @ApiPropertyOptional({
    description: 'Group by period',
    enum: ['day', 'week', 'month'],
    default: 'month',
  })
  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month' = 'month';
}

export class RecentActivityQueryDto {
  @ApiPropertyOptional({
    description: 'Number of activities to return',
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
