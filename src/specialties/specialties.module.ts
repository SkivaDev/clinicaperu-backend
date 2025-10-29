import { Module } from '@nestjs/common';
import { SpecialtiesService } from './specialties.service';
import { SpecialtiesController } from './specialties.controller';
import { PublicSpecialtiesController } from './public-specialties.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [SpecialtiesController, PublicSpecialtiesController],
  providers: [SpecialtiesService, PrismaService],
})
export class SpecialtiesModule {}
