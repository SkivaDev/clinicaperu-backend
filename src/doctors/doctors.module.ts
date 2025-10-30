import { Module } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { PublicDoctorsController } from './public-doctors.controller';
import { DoctorStatisticsController } from './doctor-statistics.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { HashingModule } from 'src/common/hashing/hashing.module';

@Module({
  imports: [PrismaModule, HashingModule],
  controllers: [
    DoctorsController,
    PublicDoctorsController,
    DoctorStatisticsController,
  ],
  providers: [DoctorsService],
})
export class DoctorsModule {}
