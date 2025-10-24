import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { SchedulesRestController } from './schedules-rest.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SchedulesService } from './schedules.service';
import { SlotGeneratorService } from 'src/slots/slot-generator.service';
import { SlotsService } from 'src/slots/slots.service';
import { ScheduleOwnershipGuard } from './guards/schedule-ownership.guard';

@Module({
  imports: [PrismaModule],
  controllers: [SchedulesController, SchedulesRestController],
  providers: [
    SchedulesService,
    SlotGeneratorService,
    SlotsService,
    ScheduleOwnershipGuard,
  ],
  exports: [SchedulesService, SlotGeneratorService, SlotsService],
})
export class SchedulesModule {}
