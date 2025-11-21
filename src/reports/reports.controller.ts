import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  QueryReportsDto,
  TopDoctorsQueryDto,
  RevenueChartQueryDto,
  RecentActivityQueryDto,
} from './dto/query-reports.dto';
import { KPIResponseDto } from './dto/kpi-response.dto';
import { RevenueChartDto } from './dto/revenue-chart.dto';
import { AppointmentStatsDto } from './dto/appointment-stats.dto';
import { TopDoctorsDto } from './dto/top-doctors.dto';
import { RecentActivityDto } from './dto/recent-activity.dto';
import { OperationalAnalyticsDto } from './dto/operational-analytics.dto';
import { FinancialAnalyticsDto } from './dto/financial-analytics.dto';
import { MedicalAnalyticsDto } from './dto/medical-analytics.dto';
import { FilterOptionsDto } from './dto/filter-options.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get all KPI metrics for the dashboard' })
  @ApiResponse({ status: 200, description: 'Returns KPI metrics', type: KPIResponseDto })
  async getKPIs(@Query() query: QueryReportsDto): Promise<KPIResponseDto> {
    return this.reportsService.getKPIs(query);
  }

  @Get('revenue/chart')
  @ApiOperation({ summary: 'Get revenue chart data' })
  @ApiResponse({ status: 200, description: 'Returns revenue chart data', type: RevenueChartDto })
  async getRevenueChart(@Query() query: RevenueChartQueryDto): Promise<RevenueChartDto> {
    return this.reportsService.getRevenueChart(query);
  }

  @Get('appointments/stats')
  @ApiOperation({ summary: 'Get appointment statistics by status' })
  @ApiResponse({
    status: 200,
    description: 'Returns appointment statistics',
    type: AppointmentStatsDto,
  })
  async getAppointmentStats(@Query() query: QueryReportsDto): Promise<AppointmentStatsDto> {
    return this.reportsService.getAppointmentStats(query);
  }

  @Get('doctors/top')
  @ApiOperation({ summary: 'Get top performing doctors' })
  @ApiResponse({ status: 200, description: 'Returns top doctors', type: TopDoctorsDto })
  async getTopDoctors(@Query() query: TopDoctorsQueryDto): Promise<TopDoctorsDto> {
    return this.reportsService.getTopDoctors(query);
  }

  @Get('activity/recent')
  @ApiOperation({ summary: 'Get recent activity feed' })
  @ApiResponse({ status: 200, description: 'Returns recent activities', type: RecentActivityDto })
  async getRecentActivity(@Query() query: RecentActivityQueryDto): Promise<RecentActivityDto> {
    return this.reportsService.getRecentActivity(query);
  }

  @Get('operational')
  @ApiOperation({ summary: 'Get operational analytics (heatmap, funnel, cancellations)' })
  @ApiResponse({
    status: 200,
    description: 'Returns operational analytics',
    type: OperationalAnalyticsDto,
  })
  async getOperationalAnalytics(
    @Query() query: QueryReportsDto,
  ): Promise<OperationalAnalyticsDto> {
    return this.reportsService.getOperationalAnalytics(query);
  }

  @Get('financial')
  @ApiOperation({
    summary: 'Get financial analytics (payment methods, revenue by specialty, projections)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns financial analytics',
    type: FinancialAnalyticsDto,
  })
  async getFinancialAnalytics(@Query() query: QueryReportsDto): Promise<FinancialAnalyticsDto> {
    return this.reportsService.getFinancialAnalytics(query);
  }

  @Get('medical')
  @ApiOperation({
    summary: 'Get medical analytics (diagnoses, consultation types, appointments by specialty)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns medical analytics',
    type: MedicalAnalyticsDto,
  })
  async getMedicalAnalytics(@Query() query: QueryReportsDto): Promise<MedicalAnalyticsDto> {
    return this.reportsService.getMedicalAnalytics(query);
  }

  @Get('filters/options')
  @ApiOperation({ summary: 'Get available filter options for reports' })
  @ApiResponse({
    status: 200,
    description: 'Returns filter options',
    type: FilterOptionsDto,
  })
  async getFilterOptions(): Promise<FilterOptionsDto> {
    return this.reportsService.getFilterOptions();
  }
}
