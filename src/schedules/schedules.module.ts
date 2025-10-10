import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SchedulesService } from './schedules.service';
import { SlotGeneratorService } from 'src/slots/slot-generator.service';

@Module({
  imports: [PrismaModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, SlotGeneratorService],
  exports: [SchedulesService, SlotGeneratorService],
})
export class SchedulesModule {}
