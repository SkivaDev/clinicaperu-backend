import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin/admin.module';
import { SpecialtiesModule } from './specialties/specialties.module';
import { ClinicsModule } from './clinics/clinics.module';
import { DoctorsModule } from './doctors/doctors.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    SpecialtiesModule,
    ClinicsModule,
    DoctorsModule,
  ],
})
export class AppModule {}
