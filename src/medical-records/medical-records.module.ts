import { Module } from '@nestjs/common';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordAccessService } from './medical-record-access.service';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../common/s3/s3.module';

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService, MedicalRecordAccessService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
