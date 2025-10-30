import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin/admin.module';
import { SpecialtiesModule } from './specialties/specialties.module';
import { ClinicsModule } from './clinics/clinics.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { SchedulesModule } from './schedules/schedules.module';
import { RoomsModule } from './rooms/rooms.module';
import { SlotsModule } from './slots/slots.module';
import { CalendarModule } from './calendar/calendar.module';
import { EmailModule } from './email/email.module';
import { UnavailabilityModule } from './unavailability/unavailability.module';
import { PatientsModule } from './patients/patients.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    SpecialtiesModule,
    ClinicsModule,
    DoctorsModule,
    PatientsModule,
    AppointmentsModule,
    SchedulesModule,
    RoomsModule,
    SlotsModule,
    CalendarModule,
    EmailModule,
    UnavailabilityModule,
  ],
})
export class AppModule {}
