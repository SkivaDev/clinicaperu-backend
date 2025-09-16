import { Module } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { HashingModule } from 'src/common/hashing/hashing.module';

@Module({
  imports: [PrismaModule, HashingModule],
  controllers: [DoctorsController],
  providers: [DoctorsService],
})
export class DoctorsModule {}
