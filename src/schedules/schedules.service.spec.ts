import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesService } from './schedules.service';
import { SlotGeneratorService } from 'src/slots/slot-generator.service';
import { PrismaService } from 'src/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let prismaService: PrismaService;
  let slotGeneratorService: SlotGeneratorService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    schedule: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
    },
    doctor: {
      findUnique: jest.fn(),
    },
    slot: {
      deleteMany: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockSlotGeneratorService = {
    cleanupFutureFreeSlotsForDoctor: jest.fn(),
    generateSlotsForActiveSchedules: jest.fn(),
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
          provide: SlotGeneratorService,
          useValue: mockSlotGeneratorService,
        },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);
    prismaService = module.get<PrismaService>(PrismaService);
    slotGeneratorService = module.get<SlotGeneratorService>(SlotGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateSchedules', () => {
    it('should validate doctor exists', async () => {
      const doctorId = 'test-doctor-id';
      const schedules: CreateScheduleDto[] = [
        {
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '14:00',
          slotMinutes: 30,
          isActive: true,
        },
      ];

      mockPrismaService.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSchedules(doctorId, schedules),
      ).rejects.toThrow('Doctor no encontrado');
    });

    it('should validate at least one active schedule', async () => {
      const doctorId = 'test-doctor-id';
      const schedules: CreateScheduleDto[] = [
        {
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '14:00',
          slotMinutes: 30,
          isActive: false,
        },
      ];

      mockPrismaService.doctor.findUnique.mockResolvedValue({ id: doctorId });

      await expect(
        service.updateSchedules(doctorId, schedules),
      ).rejects.toThrow('El doctor debe tener al menos un horario activo');
    });

    it('should validate no overlapping schedules', async () => {
      const doctorId = 'test-doctor-id';
      const schedules: CreateScheduleDto[] = [
        {
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '14:00',
          slotMinutes: 30,
          isActive: true,
        },
        {
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '16:00',
          slotMinutes: 30,
          isActive: true,
        },
      ];

      mockPrismaService.doctor.findUnique.mockResolvedValue({ id: doctorId });

      await expect(
        service.updateSchedules(doctorId, schedules),
      ).rejects.toThrow('Hay horarios solapados en Lunes');
    });

    it('should successfully update schedules', async () => {
      const doctorId = 'test-doctor-id';
      const schedules: CreateScheduleDto[] = [
        {
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '14:00',
          slotMinutes: 30,
          isActive: true,
        },
      ];

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback({
          schedule: {
            updateMany: jest.fn().mockResolvedValue({ count: 2 }),
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
            findMany: jest.fn().mockResolvedValue([
              {
                id: 'schedule-1',
                dayOfWeek: 1,
                startTime: '08:00',
                endTime: '14:00',
                slotMinutes: 30,
                isActive: true,
                effectiveFrom: null,
                effectiveTo: null,
                doctorId,
                createdAt: new Date(),
                updatedAt: new Date(),
                slots: [],
              },
            ]),
          },
        });
      });

      mockPrismaService.doctor.findUnique.mockResolvedValue({ id: doctorId });
      mockPrismaService.$transaction = mockTransaction;
      mockSlotGeneratorService.cleanupFutureFreeSlotsForDoctor.mockResolvedValue(5);
      mockSlotGeneratorService.generateSlotsForActiveSchedules.mockResolvedValue([]);

      const result = await service.updateSchedules(doctorId, schedules);

      expect(result).toHaveLength(1);
      expect(result[0].dayOfWeek).toBe(1);
      expect(result[0].isActive).toBe(true);
    });
  });

  describe('getScheduleStatistics', () => {
    it('should return correct statistics', async () => {
      const doctorId = 'test-doctor-id';

      mockPrismaService.doctor.findUnique.mockResolvedValue({ id: doctorId });
      mockPrismaService.schedule.groupBy.mockResolvedValue([
        { isActive: true, _count: { _all: 3 } },
        { isActive: false, _count: { _all: 1 } },
      ]);
      mockPrismaService.slot.groupBy.mockResolvedValue([
        { status: 'FREE', _count: { _all: 20 } },
        { status: 'BOOKED', _count: { _all: 5 } },
        { status: 'HELD', _count: { _all: 2 } },
        { status: 'BLOCKED', _count: { _all: 1 } },
      ]);

      const result = await service.getScheduleStatistics(doctorId);

      expect(result).toEqual({
        totalSchedules: 4,
        activeSchedules: 3,
        inactiveSchedules: 1,
        totalSlots: 28,
        freeSlots: 20,
        bookedSlots: 5,
        heldSlots: 2,
        blockedSlots: 1,
      });
    });
  });
});