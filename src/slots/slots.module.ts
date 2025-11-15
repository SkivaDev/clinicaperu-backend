import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';
import { SlotGeneratorService } from './slot-generator.service';
import { SlotsCronService } from './slots-cron.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [SlotsController],
  providers: [SlotsService, SlotGeneratorService, SlotsCronService],
  exports: [SlotsService, SlotGeneratorService],
})
export class SlotsModule {}
