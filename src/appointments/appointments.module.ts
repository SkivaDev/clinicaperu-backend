import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentsCronService } from './appointments-cron.service';
import { BookingService } from './booking.service';
import { DoctorSlotOwnershipGuard } from './guards/doctor-slot-ownership.guard';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
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
