import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from 'src/common/s3/s3.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentsCronService } from './appointments-cron.service';
import { BookingService } from './booking.service';
import { DoctorSlotOwnershipGuard } from './guards/doctor-slot-ownership.guard';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [PrismaModule, S3Module, EmailModule, ScheduleModule.forRoot()],
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    AppointmentsCronService,
    BookingService,
    DoctorSlotOwnershipGuard,
  ],
  exports: [AppointmentsService, BookingService],
})
export class AppointmentsModule {}
