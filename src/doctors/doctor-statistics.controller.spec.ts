import { Test, TestingModule } from '@nestjs/testing';
import { DoctorStatisticsController } from './doctor-statistics.controller';
import { DoctorsService } from './doctors.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { DateRangeEnum } from './dto/doctor-statistics.dto';

describe('DoctorStatisticsController', () => {
  let controller: DoctorStatisticsController;
  let doctorsService: DoctorsService;
  let prismaService: PrismaService;

  const mockDoctorId = 'doctor-uuid-123';
  const mockUserId = 'user-uuid-123';

  const mockStatistics = {
    currentMonth: {
      totalAttended: 45,
      totalCancelled: 5,
      totalNoShows: 3,
      occupancyRate: 75.5,
      estimatedRevenue: 4500.0,
      variationVsPreviousMonth: 12.5,
    },
    historical: {
      attendedByMonth: [
        { month: '2024-05', count: 40 },
        { month: '2024-06', count: 42 },
      ],
      noShowRateByMonth: [
        { month: '2024-05', rate: 5.5 },
        { month: '2024-06', rate: 6.0 },
      ],
    },
    general: {
      totalUniquePatientsAttended: 150,
      averageRating: 4.7,
      upcomingAppointments: [],
    },
    generatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoctorStatisticsController],
      providers: [
        {
          provide: DoctorsService,
          useValue: {
            getStatistics: jest.fn().mockResolvedValue(mockStatistics),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            doctor: {
              findUnique: jest.fn().mockResolvedValue({ id: mockDoctorId }),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<DoctorStatisticsController>(
      DoctorStatisticsController,
    );
    doctorsService = module.get<DoctorsService>(DoctorsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatistics', () => {
    it('should return statistics for authenticated doctor', async () => {
      const user = {
        userId: mockUserId,
        dni: '12345678',
        role: 'DOCTOR' as const,
      };

      const query = { dateRange: DateRangeEnum.THIS_MONTH };

      const result = await controller.getStatistics(user, query);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Estadísticas obtenidas exitosamente');
      expect(result.data).toEqual(mockStatistics);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaService.doctor.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        select: { id: true },
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(doctorsService.getStatistics).toHaveBeenCalledWith(
        mockDoctorId,
        DateRangeEnum.THIS_MONTH,
      );
    });

    it('should throw NotFoundException if doctor profile not found', async () => {
      const user = {
        userId: 'non-existent-user',
        dni: '12345678',
        role: 'DOCTOR' as const,
      };

      const query = { dateRange: DateRangeEnum.THIS_MONTH };

      jest.spyOn(prismaService.doctor, 'findUnique').mockResolvedValue(null);

      await expect(controller.getStatistics(user, query)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use default date range if not provided', async () => {
      const user = {
        userId: mockUserId,
        dni: '12345678',
        role: 'DOCTOR' as const,
      };

      const query = {};

      const result = await controller.getStatistics(user, query);

      expect(result.statusCode).toBe(200);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(doctorsService.getStatistics).toHaveBeenCalledWith(
        mockDoctorId,
        undefined,
      );
    });
  });
});
