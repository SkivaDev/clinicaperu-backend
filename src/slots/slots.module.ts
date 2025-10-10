import { Module } from '@nestjs/common';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';
import { SlotGeneratorService } from './slot-generator.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SlotsController],
  providers: [SlotsService, SlotGeneratorService],
  exports: [SlotsService, SlotGeneratorService],
})
export class SlotsModule {}