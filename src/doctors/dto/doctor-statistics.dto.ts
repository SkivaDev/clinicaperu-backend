import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';

/**
 * Enum para rangos de fechas disponibles
 */
export enum DateRangeEnum {
  THIS_MONTH = 'THIS_MONTH',
  LAST_3_MONTHS = 'LAST_3_MONTHS',
  LAST_6_MONTHS = 'LAST_6_MONTHS',
}

/**
 * Query DTO para filtrar estadísticas por rango de fechas
 */
export class StatisticsQueryDto {
  @ApiProperty({
    description: 'Rango de fechas para las estadísticas',
    enum: DateRangeEnum,
    required: false,
    default: DateRangeEnum.THIS_MONTH,
  })
  @IsOptional()
  @IsEnum(DateRangeEnum)
  dateRange?: DateRangeEnum = DateRangeEnum.THIS_MONTH;
}

/**
 * DTO para métricas del mes actual
 */
export class CurrentMonthMetricsDto {
  @ApiProperty({
    description: 'Total de citas atendidas este mes',
    example: 45,
  })
  totalAttended: number;

  @ApiProperty({
    description: 'Total de citas canceladas este mes',
    example: 5,
  })
  totalCancelled: number;

  @ApiProperty({
    description: 'Total de no-shows este mes',
    example: 3,
  })
  totalNoShows: number;

  @ApiProperty({
    description:
      'Tasa de ocupación en porcentaje (slots booked / slots totales)',
    example: 75.5,
  })
  occupancyRate: number;

  @ApiProperty({
    description:
      'Ingresos estimados del mes (citas atendidas × precio consulta)',
    example: 4500.0,
  })
  estimatedRevenue: number;

  @ApiProperty({
    description: 'Variación porcentual vs mes anterior',
    example: 12.5,
    required: false,
  })
  variationVsPreviousMonth?: number;
}

/**
 * DTO para datos mensuales históricos
 */
export class MonthlyDataDto {
  @ApiProperty({
    description: 'Mes en formato YYYY-MM',
    example: '2024-10',
  })
  month: string;

  @ApiProperty({
    description: 'Cantidad de citas',
    example: 42,
  })
  count: number;
}

/**
 * DTO para datos de tasa de no-show mensual
 */
export class MonthlyNoShowRateDto {
  @ApiProperty({
    description: 'Mes en formato YYYY-MM',
    example: '2024-10',
  })
  month: string;

  @ApiProperty({
    description: 'Tasa de no-show en porcentaje',
    example: 6.5,
  })
  rate: number;
}

/**
 * DTO para métricas históricas (últimos 6 meses)
 */
export class HistoricalMetricsDto {
  @ApiProperty({
    description: 'Citas atendidas por mes (últimos 6 meses)',
    type: [MonthlyDataDto],
  })
  attendedByMonth: MonthlyDataDto[];

  @ApiProperty({
    description: 'Tasa de no-show por mes (últimos 6 meses)',
    type: [MonthlyNoShowRateDto],
  })
  noShowRateByMonth: MonthlyNoShowRateDto[];
}

/**
 * DTO para próxima cita
 */
export class UpcomingAppointmentDto {
  @ApiProperty({
    description: 'ID de la cita',
    example: 'uuid-123',
  })
  id: string;

  @ApiProperty({
    description: 'Fecha y hora de inicio',
    example: '2024-10-30T14:00:00Z',
  })
  startAt: Date;

  @ApiProperty({
    description: 'Fecha y hora de fin',
    example: '2024-10-30T14:30:00Z',
  })
  endAt: Date;

  @ApiProperty({
    description: 'Nombre del paciente',
    example: 'Juan Pérez',
  })
  patientName: string;

  @ApiProperty({
    description: 'Motivo de la cita',
    example: 'Consulta general',
    required: false,
  })
  reason?: string;
}

/**
 * DTO para métricas generales
 */
export class GeneralMetricsDto {
  @ApiProperty({
    description: 'Total de pacientes únicos atendidos (histórico)',
    example: 150,
  })
  totalUniquePatientsAttended: number;

  @ApiProperty({
    description: 'Rating promedio del doctor',
    example: 4.7,
    required: false,
  })
  averageRating?: number;

  @ApiProperty({
    description: 'Próximas citas (siguientes 7 días)',
    type: [UpcomingAppointmentDto],
  })
  upcomingAppointments: UpcomingAppointmentDto[];
}

/**
 * DTO de respuesta completa para estadísticas del doctor
 */
export class DoctorStatisticsDto {
  @ApiProperty({
    description: 'Métricas del mes actual',
    type: CurrentMonthMetricsDto,
  })
  currentMonth: CurrentMonthMetricsDto;

  @ApiProperty({
    description: 'Métricas históricas (últimos 6 meses)',
    type: HistoricalMetricsDto,
  })
  historical: HistoricalMetricsDto;

  @ApiProperty({
    description: 'Métricas generales',
    type: GeneralMetricsDto,
  })
  general: GeneralMetricsDto;

  @ApiProperty({
    description: 'Fecha de generación de las estadísticas',
    example: '2024-10-30T10:00:00Z',
  })
  generatedAt: Date;
}
