import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { HashingModule } from 'src/common/hashing/hashing.module';

@Module({
  imports: [PrismaModule, HashingModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
