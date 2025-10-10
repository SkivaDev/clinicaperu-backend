import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SchedulesService } from './schedules.service';
import { SlotGeneratorService } from 'src/slots/slot-generator.service';
import { SlotsService } from 'src/slots/slots.service';

@Module({
  imports: [PrismaModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, SlotGeneratorService, SlotsService],
  exports: [SchedulesService, SlotGeneratorService, SlotsService],
})
export class SchedulesModule {}
