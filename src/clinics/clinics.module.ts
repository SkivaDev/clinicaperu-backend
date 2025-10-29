import { Module } from '@nestjs/common';
import { ClinicsService } from './clinics.service';
import { ClinicsController } from './clinics.controller';
import { PublicClinicsController } from './public-clinics.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicsController, PublicClinicsController],
  providers: [ClinicsService],
})
export class ClinicsModule {}
