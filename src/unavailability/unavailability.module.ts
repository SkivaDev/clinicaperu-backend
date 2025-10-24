import { Module } from '@nestjs/common';
import { UnavailabilityController } from './unavailability.controller';
import { UnavailabilityService } from './unavailability.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UnavailabilityController],
  providers: [UnavailabilityService],
  exports: [UnavailabilityService],
})
export class UnavailabilityModule {}
