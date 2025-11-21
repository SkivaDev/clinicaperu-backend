import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  QueryReportsDto,
  TopDoctorsQueryDto,
  RevenueChartQueryDto,
  RecentActivityQueryDto,
} from './dto/query-reports.dto';
import {
  AppointmentStatus,
  PaymentStatus,
  SlotStatus,
  PaymentMethod,
} from '@prisma/client';
import { subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // Helper: Calculate previous period dates
  private calculatePreviousPeriod(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      start: subMonths(start, 1),
      end: subMonths(end, 1),
      days: diffDays,
    };
  }

  // Helper: Calculate growth percentage
  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  // Helper: Build base appointment where clause
  private buildAppointmentWhereClause(filters: QueryReportsDto) {
    return {
      createdAt: {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      },
      ...(filters.doctorId && { doctorId: filters.doctorId }),
      ...(filters.specialtyId && {
        doctor: { specialtyId: filters.specialtyId },
      }),
      ...(filters.status && { status: filters.status }),
    };
  }

  // KPI: Total Revenue
  async getTotalRevenue(filters: QueryReportsDto) {
    const currentRevenue = await this.prisma.payment.aggregate({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        },
        ...(filters.doctorId && {
          appointment: { doctorId: filters.doctorId },
        }),
        ...(filters.paymentMethod && {
          paymentMethod: filters.paymentMethod,
        }),
      },
      _sum: { amount: true },
    });

    const previousPeriod = this.calculatePreviousPeriod(
      filters.startDate,
      filters.endDate,
    );
    const previousRevenue = await this.prisma.payment.aggregate({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: {
          gte: previousPeriod.start,
          lte: previousPeriod.end,
        },
      },
      _sum: { amount: true },
    });

    const current = Number(currentRevenue._sum.amount || 0);
    const previous = Number(previousRevenue._sum.amount || 0);
    const growth = this.calculateGrowth(current, previous);

    return {
      value: current,
      growth,
      isPositive: growth >= 0,
      description: `+${Math.abs(growth)}% vs mes anterior`,
    };
  }

  // KPI: Total Appointments
  async getTotalAppointments(filters: QueryReportsDto) {
    const current = await this.prisma.appointment.count({
      where: this.buildAppointmentWhereClause(filters),
    });

    const previousPeriod = this.calculatePreviousPeriod(
      filters.startDate,
      filters.endDate,
    );
    const previous = await this.prisma.appointment.count({
      where: {
        createdAt: {
          gte: previousPeriod.start,
          lte: previousPeriod.end,
        },
      },
    });

    const growth = this.calculateGrowth(current, previous);

    return {
      value: current,
      growth,
      isPositive: growth >= 0,
      description: `+${Math.abs(growth)}% vs mes anterior`,
    };
  }

  // KPI: Occupancy Rate
  async getOccupancyRate(filters: QueryReportsDto) {
    const totalSlots = await this.prisma.slot.count({
      where: {
        startAt: {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        },
        isActive: true,
        ...(filters.doctorId && {
          schedule: { doctorId: filters.doctorId },
        }),
      },
    });

    const bookedSlots = await this.prisma.slot.count({
      where: {
        startAt: {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        },
        status: SlotStatus.BOOKED,
        isActive: true,
        ...(filters.doctorId && {
          schedule: { doctorId: filters.doctorId },
        }),
      },
    });

    const rate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

    const previousPeriod = this.calculatePreviousPeriod(
      filters.startDate,
      filters.endDate,
    );
    const prevTotal = await this.prisma.slot.count({
      where: {
        startAt: { gte: previousPeriod.start, lte: previousPeriod.end },
        isActive: true,
      },
    });
    const prevBooked = await this.prisma.slot.count({
      where: {
        startAt: { gte: previousPeriod.start, lte: previousPeriod.end },
        status: SlotStatus.BOOKED,
        isActive: true,
      },
    });
    const prevRate = prevTotal > 0 ? (prevBooked / prevTotal) * 100 : 0;

    const growth = Number((rate - prevRate).toFixed(1));

    return {
      value: Number(rate.toFixed(1)),
      growth,
      isPositive: growth >= 0,
      description: `+${Math.abs(growth)}% vs mes anterior`,
    };
  }

  // KPI: New Patients
  async getNewPatients(filters: QueryReportsDto) {
    const newPatients = await this.prisma.user.count({
      where: {
        role: 'PATIENT',
        createdAt: {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        },
      },
    });

    const totalPatients = await this.prisma.user.count({
      where: { role: 'PATIENT' },
    });

    const percentage =
      totalPatients > 0 ? (newPatients / totalPatients) * 100 : 0;

    const previousPeriod = this.calculatePreviousPeriod(
      filters.startDate,
      filters.endDate,
    );
    const prevNew = await this.prisma.user.count({
      where: {
        role: 'PATIENT',
        createdAt: { gte: previousPeriod.start, lte: previousPeriod.end },
      },
    });

    const growth = this.calculateGrowth(newPatients, prevNew);

    return {
      value: newPatients,
      growth,
      isPositive: growth >= 0,
      description: `${percentage.toFixed(1)}% del total de pacientes`,
    };
  }

  // KPI: Average Wait Time (mock for now)
  async getAvgWaitTime(filters: QueryReportsDto) {
    return {
      value: 12,
      growth: 14,
      isPositive: true,
      description: '-2 min vs mes anterior',
    };
  }

  // KPI: Cancellation Rate
  async getCancellationRate(filters: QueryReportsDto) {
    const total = await this.prisma.appointment.count({
      where: this.buildAppointmentWhereClause(filters),
    });

    const cancelled = await this.prisma.appointment.count({
      where: {
        ...this.buildAppointmentWhereClause(filters),
        status: AppointmentStatus.CANCELLED,
      },
    });

    const rate = total > 0 ? (cancelled / total) * 100 : 0;

    const previousPeriod = this.calculatePreviousPeriod(
      filters.startDate,
      filters.endDate,
    );
    const prevTotal = await this.prisma.appointment.count({
      where: {
        createdAt: { gte: previousPeriod.start, lte: previousPeriod.end },
      },
    });
    const prevCancelled = await this.prisma.appointment.count({
      where: {
        createdAt: { gte: previousPeriod.start, lte: previousPeriod.end },
        status: AppointmentStatus.CANCELLED,
      },
    });
    const prevRate = prevTotal > 0 ? (prevCancelled / prevTotal) * 100 : 0;

    const growth = Number((rate - prevRate).toFixed(1));

    return {
      value: Number(rate.toFixed(1)),
      growth: Math.abs(growth),
      isPositive: growth <= 0,
      description: `+${Math.abs(growth)}% vs mes anterior`,
    };
  }

  // KPI: Retention Rate
  async getRetentionRate(filters: QueryReportsDto) {
    const patientsWithMultipleAppointments =
      await this.prisma.appointment.groupBy({
        by: ['userId'],
        where: this.buildAppointmentWhereClause(filters),
        having: {
          userId: {
            _count: {
              gt: 1,
            },
          },
        },
      });

    const totalPatients = await this.prisma.appointment.groupBy({
      by: ['userId'],
      where: this.buildAppointmentWhereClause(filters),
    });

    const rate =
      totalPatients.length > 0
        ? (patientsWithMultipleAppointments.length / totalPatients.length) * 100
        : 0;

    return {
      value: Number(rate.toFixed(0)),
      growth: 2,
      isPositive: true,
      description: 'Pacientes recurrentes',
    };
  }

  // KPI: Active Patients
  async getActivePatients(filters: QueryReportsDto) {
    const activePatients = await this.prisma.appointment.groupBy({
      by: ['userId'],
      where: this.buildAppointmentWhereClause(filters),
    });

    const previousPeriod = this.calculatePreviousPeriod(
      filters.startDate,
      filters.endDate,
    );
    const prevActive = await this.prisma.appointment.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: previousPeriod.start, lte: previousPeriod.end },
      },
    });

    const growth = this.calculateGrowth(
      activePatients.length,
      prevActive.length,
    );

    return {
      value: activePatients.length,
      growth,
      isPositive: growth >= 0,
      description: 'En los últimos 30 días',
    };
  }

  // Main KPI endpoint
  async getKPIs(filters: QueryReportsDto) {
    const [
      totalRevenue,
      totalAppointments,
      occupancyRate,
      newPatients,
      avgWaitTime,
      cancellationRate,
      retentionRate,
      activePatients,
    ] = await Promise.all([
      this.getTotalRevenue(filters),
      this.getTotalAppointments(filters),
      this.getOccupancyRate(filters),
      this.getNewPatients(filters),
      this.getAvgWaitTime(filters),
      this.getCancellationRate(filters),
      this.getRetentionRate(filters),
      this.getActivePatients(filters),
    ]);

    return {
      totalRevenue,
      totalAppointments,
      occupancyRate,
      newPatients,
      avgWaitTime,
      cancellationRate,
      retentionRate,
      activePatients,
    };
  }

  // Revenue Chart
  async getRevenueChart(filters: RevenueChartQueryDto) {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        },
      },
      select: {
        amount: true,
        paidAt: true,
      },
    });

    const groupedData = new Map<string, number>();

    payments.forEach((payment) => {
      if (!payment.paidAt) return;
      const monthKey = format(payment.paidAt, 'MMM', { locale: es });
      const current = groupedData.get(monthKey) || 0;
      groupedData.set(monthKey, current + Number(payment.amount));
    });

    const data = Array.from(groupedData.entries()).map(([name, total]) => ({
      name,
      total: Number(total.toFixed(2)),
    }));

    return { data };
  }

  // Appointment Stats
  async getAppointmentStats(filters: QueryReportsDto) {
    const [completed, pending, confirmed, cancelled, noShow] =
      await Promise.all([
        this.prisma.appointment.count({
          where: {
            ...this.buildAppointmentWhereClause(filters),
            status: AppointmentStatus.ATTENDED,
          },
        }),
        this.prisma.appointment.count({
          where: {
            ...this.buildAppointmentWhereClause(filters),
            status: AppointmentStatus.PENDING,
          },
        }),
        this.prisma.appointment.count({
          where: {
            ...this.buildAppointmentWhereClause(filters),
            status: AppointmentStatus.CONFIRMED,
          },
        }),
        this.prisma.appointment.count({
          where: {
            ...this.buildAppointmentWhereClause(filters),
            status: AppointmentStatus.CANCELLED,
          },
        }),
        this.prisma.appointment.count({
          where: {
            ...this.buildAppointmentWhereClause(filters),
            status: AppointmentStatus.NO_SHOW,
          },
        }),
      ]);

    const pendingTotal = pending + confirmed;
    const total = completed + pendingTotal + cancelled + noShow;

    return {
      data: [
        { name: 'Completadas', value: completed, color: 'hsl(142, 76%, 36%)' },
        { name: 'Pendientes', value: pendingTotal, color: 'hsl(48, 96%, 53%)' },
        { name: 'Canceladas', value: cancelled, color: 'hsl(0, 84%, 60%)' },
        { name: 'No Asistió', value: noShow, color: 'hsl(240, 5%, 64%)' },
      ],
      total,
    };
  }

  // Top Doctors
  async getTopDoctors(query: TopDoctorsQueryDto) {
    const doctors = await this.prisma.doctor.findMany({
      where: {
        isActive: true,
        appointments: {
          some: {
            createdAt: {
              gte: new Date(query.startDate),
              lte: new Date(query.endDate),
            },
          },
        },
      },
      select: {
        id: true,
        rating: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        specialty: {
          select: {
            name: true,
          },
        },
        appointments: {
          where: {
            createdAt: {
              gte: new Date(query.startDate),
              lte: new Date(query.endDate),
            },
            status: AppointmentStatus.ATTENDED,
          },
          select: {
            userId: true,
          },
        },
      },
    });

    const doctorsWithStats = doctors.map((doctor) => {
      const uniquePatients = new Set(doctor.appointments.map((a) => a.userId));
      return {
        id: doctor.id,
        name: `Dr. ${doctor.user.firstName} ${doctor.user.lastName}`,
        specialty: doctor.specialty.name,
        patientsCount: uniquePatients.size,
        rating: doctor.rating,
        profileImage: doctor.user.profileImage || undefined,
        initials: `${doctor.user.firstName[0]}${doctor.user.lastName[0]}`,
      };
    });

    const sorted = doctorsWithStats.sort(
      (a, b) => b.patientsCount - a.patientsCount,
    );

    return {
      doctors: sorted.slice(0, query.limit || 10),
    };
  }

  // Recent Activity
  async getRecentActivity(query: RecentActivityQueryDto) {
    const recentAppointments = await this.prisma.appointment.findMany({
      take: query.limit || 10,
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        doctor: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const activities = recentAppointments.map((apt) => ({
      user: `${apt.user.firstName} ${apt.user.lastName}`,
      action: 'reservó una cita con',
      target: `Dr. ${apt.doctor.user.firstName} ${apt.doctor.user.lastName}`,
      timestamp: apt.createdAt,
      avatar: apt.user.profileImage || undefined,
      initials: `${apt.user.firstName[0]}${apt.user.lastName[0]}`,
    }));

    return { activities };
  }

  // Operational Analytics
  async getOperationalAnalytics(filters: QueryReportsDto) {
    // Heatmap: Citas por hora y día de la semana
    const appointments = await this.prisma.appointment.findMany({
      where: this.buildAppointmentWhereClause(filters),
      include: {
        slot: true,
      },
    });

    // Inicializar heatmap con 0
    const hours = Array.from(
      { length: 12 },
      (_, i) => `${String(8 + i).padStart(2, '0')}:00`,
    );
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const heatmapData = hours.map((hour) => {
      const row: any = { hour };
      days.forEach((day) => (row[day] = 0));
      return row;
    });

    // Llenar heatmap con datos reales
    appointments.forEach((apt) => {
      if (apt.slot?.startAt) {
        const date = new Date(apt.slot.startAt);
        const hour = date.getHours();
        const dayOfWeek = date.getDay(); // 0=domingo, 1=lunes, ...
        const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayKey = dayMap[dayOfWeek];

        if (hour >= 8 && hour < 20 && dayKey !== 'sun') {
          const hourIndex = hour - 8;
          if (heatmapData[hourIndex] && days.includes(dayKey)) {
            heatmapData[hourIndex][dayKey]++;
          }
        }
      }
    });

    // Funnel: Conversión de citas (Solicitadas -> Confirmadas -> Atendidas)
    const [total, confirmed, attended] = await Promise.all([
      this.prisma.appointment.count({
        where: this.buildAppointmentWhereClause(filters),
      }),
      this.prisma.appointment.count({
        where: {
          ...this.buildAppointmentWhereClause(filters),
          status: AppointmentStatus.CONFIRMED,
        },
      }),
      this.prisma.appointment.count({
        where: {
          ...this.buildAppointmentWhereClause(filters),
          status: AppointmentStatus.ATTENDED,
        },
      }),
    ]);

    const funnel = [
      { stage: 'Solicitadas', count: total, fill: 'hsl(217, 91%, 60%)' },
      {
        stage: 'Confirmadas',
        count: confirmed + attended,
        fill: 'hsl(142, 76%, 36%)',
      },
      { stage: 'Atendidas', count: attended, fill: 'hsl(48, 96%, 53%)' },
    ];

    // Cancellations: Tendencia de cancelaciones por día de la semana
    const cancelledAppointments = await this.prisma.appointment.findMany({
      where: {
        ...this.buildAppointmentWhereClause(filters),
        status: AppointmentStatus.CANCELLED,
      },
      include: { slot: true },
    });

    const cancellationsByDay = {
      Lun: 0,
      Mar: 0,
      Mié: 0,
      Jue: 0,
      Vie: 0,
      Sáb: 0,
      Dom: 0,
    };
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    cancelledAppointments.forEach((apt) => {
      if (apt.slot?.startAt) {
        const dayOfWeek = new Date(apt.slot.startAt).getDay();
        const dayName = dayNames[dayOfWeek];
        cancellationsByDay[dayName]++;
      }
    });

    const cancellations = Object.entries(cancellationsByDay).map(
      ([day, count]) => ({
        day,
        count,
      }),
    );

    return { heatmap: heatmapData, funnel, cancellations };
  }

  // Financial Analytics
  async getFinancialAnalytics(filters: QueryReportsDto) {
    const whereClause = {
      status: PaymentStatus.COMPLETED,
      paidAt: {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      },
      ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
    };

    // Payment Methods
    const paymentsByMethod = await this.prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: whereClause,
      _sum: { amount: true },
      _count: true,
    });

    const methodColors = {
      CASH: 'hsl(142, 76%, 36%)',
      CARD: 'hsl(217, 91%, 60%)',
      TRANSFER: 'hsl(48, 96%, 53%)',
      INSURANCE: 'hsl(280, 84%, 60%)',
    };

    const totalAmount = paymentsByMethod.reduce(
      (sum, p) => sum + Number(p._sum.amount || 0),
      0,
    );

    const paymentMethods = paymentsByMethod.map((p) => {
      const amount = Number(p._sum.amount || 0);
      return {
        name: p.paymentMethod,
        value:
          totalAmount > 0
            ? Number(((amount / totalAmount) * 100).toFixed(1))
            : 0,
        amount,
        color: methodColors[p.paymentMethod] || 'hsl(0, 0%, 50%)',
      };
    });

    // Revenue by Specialty
    const revenueBySpec = await this.prisma.payment.findMany({
      where: whereClause,
      include: {
        appointment: {
          include: {
            doctor: {
              include: {
                specialty: true,
                user: true,
              },
            },
          },
        },
      },
    });

    const specialtyRevenue = revenueBySpec.reduce(
      (acc, payment) => {
        const specialtyName =
          payment.appointment?.doctor?.specialty?.name || 'Sin especialidad';
        acc[specialtyName] = (acc[specialtyName] || 0) + Number(payment.amount);
        return acc;
      },
      {} as Record<string, number>,
    );

    const revenueBySpecialty = Object.entries(specialtyRevenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Top Doctors by Revenue
    const doctorRevenue = revenueBySpec.reduce(
      (acc, payment) => {
        const doctorName = payment.appointment?.doctor
          ? `Dr. ${payment.appointment.doctor.user.firstName} ${payment.appointment.doctor.user.lastName}`
          : 'Sin doctor';
        acc[doctorName] = (acc[doctorName] || 0) + Number(payment.amount);
        return acc;
      },
      {} as Record<string, number>,
    );

    const topDoctorsByRevenue = Object.entries(doctorRevenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Projection: Revenue by month (last 6 months)
    const projection: { month: string; actual: number; projected: number }[] =
      [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = subMonths(new Date(filters.endDate), i);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const monthRevenue = await this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.COMPLETED,
          paidAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        _sum: { amount: true },
      });

      projection.push({
        month: format(monthStart, 'MMM', { locale: es }),
        actual: Number(monthRevenue._sum.amount || 0),
        projected: Number(monthRevenue._sum.amount || 0) * 1.1, // 10% projection
      });
    }

    return {
      paymentMethods,
      revenueBySpecialty,
      topDoctorsByRevenue,
      projection,
    };
  }

  // Medical Analytics
  async getMedicalAnalytics(filters: QueryReportsDto) {
    // Top Diagnoses
    const medicalRecords = await this.prisma.medicalRecord.findMany({
      where: {
        appointment: this.buildAppointmentWhereClause(filters),
      },
    });

    const diagnosisCounts = medicalRecords.reduce(
      (acc, record) => {
        acc[record.diagnosis] = (acc[record.diagnosis] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topDiagnoses = Object.entries(diagnosisCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Consultation Types (usando recordType del MedicalRecord)
    const typeCounts = medicalRecords.reduce(
      (acc, record) => {
        acc[record.recordType] = (acc[record.recordType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const maxValue = Math.max(...Object.values(typeCounts), 1);
    const consultationTypes = Object.entries(typeCounts).map(
      ([subject, value]) => ({
        subject,
        A: value,
        fullMark: maxValue,
      }),
    );

    // Appointments by Specialty
    const appointmentsBySpec = await this.prisma.appointment.findMany({
      where: this.buildAppointmentWhereClause(filters),
      include: {
        doctor: {
          include: { specialty: true },
        },
      },
    });

    const specialtyCounts = appointmentsBySpec.reduce(
      (acc, apt) => {
        const specialtyName = apt.doctor?.specialty?.name || 'Sin especialidad';
        acc[specialtyName] = (acc[specialtyName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const appointmentsBySpecialty = Object.entries(specialtyCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return { topDiagnoses, consultationTypes, appointmentsBySpecialty };
  }

  async getFilterOptions() {
    const [doctors, specialties] = await Promise.all([
      this.prisma.doctor.findMany({
        where: { isActive: true },
        select: {
          id: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.specialty.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    return {
      doctors: doctors.map((d) => ({
        id: d.id,
        name: `Dr. ${d.user.firstName} ${d.user.lastName}`,
      })),
      specialties: specialties.map((s) => ({
        id: s.id,
        name: s.name,
      })),
      appointmentStatuses: Object.values(AppointmentStatus),
      paymentMethods: Object.values(PaymentMethod),
    };
  }
}
