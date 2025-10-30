import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { S3Module } from 'src/common/s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [UploadsController],
})
export class UploadsModule {}
