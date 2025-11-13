import { Module } from '@nestjs/common';
import { SpecialtiesService } from './specialties.service';
import { SpecialtiesController } from './specialties.controller';
import { PublicSpecialtiesController } from './public-specialties.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { SpecialtyDeactivateGuard } from './guards/specialty-deactivate.guard';

@Module({
  imports: [PrismaModule],
  controllers: [SpecialtiesController, PublicSpecialtiesController],
  providers: [SpecialtiesService, PrismaService, SpecialtyDeactivateGuard],
  exports: [SpecialtiesService],
})
export class SpecialtiesModule {}
