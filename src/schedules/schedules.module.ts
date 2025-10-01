import { Module } from '@nestjs/common';
import { SchedulesController } from './schedules.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SchedulesService } from './schedules.service';

@Module({
  imports: [PrismaModule],
  controllers: [SchedulesController],
  providers: [SchedulesService],
})
export class SchedulesModule {}
