import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HashingModule } from 'src/common/hashing/hashing.module';
import { S3Module } from 'src/common/s3/s3.module';

@Module({
  imports: [PrismaModule, HashingModule, S3Module],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
