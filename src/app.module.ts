import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { UploadsModule } from './uploads/uploads.module';
import { PaymentsModule } from './payments/payments.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';

@Module({
  imports: [
    // Config Module - Variables de entorno
    ConfigModule.forRoot({
      isGlobal: true, // Hace que ConfigModule esté disponible globalmente
      envFilePath: '.env',
    }),
    // Rate Limiting Global - Protección contra abuso
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 segundo
        limit: 10, // 10 requests por segundo (generoso para proyecto personal)
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minuto
        limit: 100, // 100 requests por minuto
      },
      {
        name: 'long',
        ttl: 900000, // 15 minutos
        limit: 500, // 500 requests por 15 minutos
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    SpecialtiesModule,
    ClinicsModule,
    DoctorsModule,
    PatientsModule,
    UploadsModule, // HU-028: Módulo para subir archivos a S3
    PaymentsModule, // HU-030: Módulo de pagos simulado
    MedicalRecordsModule, // HU-031: Módulo de expedientes médicos
    AppointmentsModule,
    SchedulesModule,
    RoomsModule,
    SlotsModule,
    CalendarModule,
    EmailModule,
    UnavailabilityModule,
  ],
  providers: [
    // Aplicar ThrottlerGuard globalmente a todos los endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
