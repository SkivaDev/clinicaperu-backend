import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesService } from './schedules.service';
import { SlotGeneratorService } from 'src/slots/slot-generator.service';
import { SlotsService } from 'src/slots/slots.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SchedulesService - Soft Deletion', () => {
  let service: SchedulesService;
  let prismaService: PrismaService;
  let slotsService: SlotsService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    schedule: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
      groupBy: jest.fn(),
    },
    doctor: {
      findUnique: jest.fn(),
    },
    slot: {
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockSlotsService = {
    deactivateFutureFreeSlotsForSchedule: jest.fn(),
    reactivateSlotsForSchedule: jest.fn(),
  };

  const mockSlotGeneratorService = {
    generateSlotsForSchedule: jest.fn(),
    generateSlotsForActiveSchedules: jest.fn(),
    cleanupFutureFreeSlotsForDoctor: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SlotsService,
          useValue: mockSlotsService,
        },
        {
          provide: SlotGeneratorService,
          useValue: mockSlotGeneratorService,
        },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);
    prismaService = module.get<PrismaService>(PrismaService);
    slotsService = module.get<SlotsService>(SlotsService);
  });

  describe('deactivateSchedule', () => {
    it('should successfully deactivate a schedule and its future free slots', async () => {
      const doctorId = 'doctor-123';
      const scheduleId = 'schedule-456';

      // Mock doctor exists
      mockPrismaService.doctor.findUnique.mockResolvedValue({ id: doctorId });

      // Mock schedule exists and is active
      mockPrismaService.schedule.findUnique.mockResolvedValue({
        id: scheduleId,
        doctorId,
        isActive: true,
      });

      // Mock transaction
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback({
          schedule: {
            update: jest
              .fn()
              .mockResolvedValue({ id: scheduleId, isActive: false }),
          },
        });
      });

      mockPrismaService.$transaction = mockTransaction;

      // Mock slot deactivation result
      mockSlotsService.deactivateFutureFreeSlotsForSchedule.mockResolvedValue({
        slotsDeactivated: 5,
        slotsPreserved: 2,
        errors: [],
      });

      const result = await service.deactivateSchedule(doctorId, scheduleId);

      expect(result.scheduleDeactivated).toBe(true);
      expect(result.slotsDeactivated).toBe(5);
      expect(result.slotsPreserved).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should throw NotFoundException when schedule does not exist', async () => {
      const doctorId = 'doctor-123';
      const scheduleId = 'schedule-456';

      mockPrismaService.doctor.findUnique.mockResolvedValue({ id: doctorId });
      mockPrismaService.schedule.findUnique.mockResolvedValue(null);

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback({
          schedule: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      mockPrismaService.$transaction = mockTransaction;

      await expect(
        service.deactivateSchedule(doctorId, scheduleId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when schedule belongs to different doctor', async () => {
      const doctorId = 'doctor-123';
      const scheduleId = 'schedule-456';

      mockPrismaService.doctor.findUnique.mockResolvedValue({ id: doctorId });

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback({
          schedule: {
            findUnique: jest.fn().mockResolvedValue({
              id: scheduleId,
              doctorId: 'different-doctor',
              isActive: true,
            }),
          },
        });
      });

      mockPrismaService.$transaction = mockTransaction;

      await expect(
        service.deactivateSchedule(doctorId, scheduleId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return early when schedule is already inactive', async () => {
      const doctorId = 'doctor-123';
      const scheduleId = 'schedule-456';

      mockPrismaService.doctor.findUnique.mockResolvedValue({ id: doctorId });

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback({
          schedule: {
            findUnique: jest.fn().mockResolvedValue({
              id: scheduleId,
              doctorId,
              isActive: false,
            }),
          },
        });
      });

      mockPrismaService.$transaction = mockTransaction;

      const result = await service.deactivateSchedule(doctorId, scheduleId);

      expect(result.scheduleDeactivated).toBe(false);
      expect(result.slotsDeactivated).toBe(0);
      expect(result.slotsPreserved).toBe(0);
      expect(result.errors).toContain('Schedule is already inactive');
    });
  });

  describe('reactivateSchedule', () => {
    it('should successfully reactivate a schedule and generate new slots', async () => {
      const doctorId = 'doctor-123';
      const scheduleId = 'schedule-456';

      mockPrismaService.doctor.findUnique.mockResolvedValue({ id: doctorId });

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback({
          schedule: {
            findUnique: jest
              .fn()
              .mockResolvedValueOnce({
                id: scheduleId,
                doctorId,
                isActive: false,
              })
              .mockResolvedValueOnce({
                id: scheduleId,
                dayOfWeek: 1,
                startTime: '08:00',
                endTime: '14:00',
                slotMinutes: 30,
                isActive: true,
              }),
            update: jest
              .fn()
              .mockResolvedValue({ id: scheduleId, isActive: true }),
          },
        });
      });

      mockPrismaService.$transaction = mockTransaction;

      mockSlotsService.reactivateSlotsForSchedule.mockResolvedValue({
        slotsReactivated: 3,
        errors: [],
      });

      mockSlotGeneratorService.generateSlotsForSchedule.mockResolvedValue({
        slotsCreated: 10,
        slotsSkipped: 0,
        errors: [],
      });

      const result = await service.reactivateSchedule(doctorId, scheduleId);

      expect(result.scheduleReactivated).toBe(true);
      expect(result.slotsReactivated).toBe(3);
      expect(result.slotsGenerated).toBe(10);
      expect(result.errors).toHaveLength(0);
    });

    it('should return early when schedule is already active', async () => {
      const doctorId = 'doctor-123';
      const scheduleId = 'schedule-456';

      mockPrismaService.doctor.findUnique.mockResolvedValue({ id: doctorId });

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback({
          schedule: {
            findUnique: jest.fn().mockResolvedValue({
              id: scheduleId,
              doctorId,
              isActive: true,
            }),
          },
        });
      });

      mockPrismaService.$transaction = mockTransaction;

      const result = await service.reactivateSchedule(doctorId, scheduleId);

      expect(result.scheduleReactivated).toBe(false);
      expect(result.slotsReactivated).toBe(0);
      expect(result.slotsGenerated).toBe(0);
      expect(result.errors).toContain('Schedule is already active');
    });
  });

  describe('getAllDoctorSchedules', () => {
    it('should return all schedules including inactive ones', async () => {
      const doctorId = 'doctor-123';

      mockPrismaService.doctor.findUnique.mockResolvedValue({ id: doctorId });
      mockPrismaService.schedule.findMany.mockResolvedValue([
        {
          id: 'schedule-1',
          isActive: true,
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '14:00',
          slots: [],
        },
        {
          id: 'schedule-2',
          isActive: false,
          dayOfWeek: 2,
          startTime: '15:00',
          endTime: '18:00',
          slots: [],
        },
      ]);

      const result = await service.getAllDoctorSchedules(doctorId);

      expect(result).toHaveLength(2);
      expect(result[0].isActive).toBe(true);
      expect(result[1].isActive).toBe(false);
    });
  });

  describe('getInactiveDoctorSchedules', () => {
    it('should return only inactive schedules', async () => {
      const doctorId = 'doctor-123';

      mockPrismaService.doctor.findUnique.mockResolvedValue({ id: doctorId });
      mockPrismaService.schedule.findMany.mockResolvedValue([
        {
          id: 'schedule-1',
          isActive: false,
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '14:00',
          slots: [],
        },
      ]);

      const result = await service.getInactiveDoctorSchedules(doctorId);

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(false);
    });
  });
});
