import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MyDoctorDto } from './dto/my-doctor.dto';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * HU-027: Obtiene la lista de doctores que han atendido al paciente
   * Query optimizada con una sola consulta usando agregaciones
   * Retorna solo doctores activos con citas confirmadas o atendidas
   * Ordenados por fecha de última cita (más reciente primero)
   */
  async getMyDoctors(patientId: string): Promise<MyDoctorDto[]> {
    const startTime = Date.now();
    this.logger.log(`Fetching doctors for patient: ${patientId}`);

    // Query optimizada: una sola consulta con JOINs y agregaciones
    // Evita N+1 queries y calcula estadísticas en la misma consulta
    const doctors = await this.prisma.$queryRaw<
      Array<{
        doctorId: string;
        firstName: string;
        lastName: string;
        profileImage: string | null;
        cmp: number;
        rating: number;
        yearsOfExperience: number | null;
        consultationPrice: number | null;
        specialtyName: string;
        clinicName: string;
        totalAppointments: bigint;
        attendedAppointments: bigint;
        lastAppointmentDate: Date;
      }>
    >`
      SELECT 
        d.id as "doctorId",
        u."firstName",
        u."lastName",
        u."profileImage",
        d.cmp,
        d.rating,
        d."yearsOfExperience",
        d."consultationPrice",
        s.name as "specialtyName",
        c.name as "clinicName",
        COUNT(a.id) as "totalAppointments",
        COUNT(CASE WHEN a.status = 'ATTENDED' THEN 1 END) as "attendedAppointments",
        MAX(sl."startAt") as "lastAppointmentDate"
      FROM "Doctor" d
      INNER JOIN "User" u ON d."userId" = u.id
      INNER JOIN "Specialty" s ON d."specialtyId" = s.id
      INNER JOIN "Clinic" c ON d."clinicId" = c.id
      INNER JOIN "Appointment" a ON d.id = a."doctorId"
      INNER JOIN "Slot" sl ON a."slotId" = sl.id
      WHERE a."userId" = ${patientId}
        AND a.status IN ('CONFIRMED', 'ATTENDED')
        AND d."isActive" = true
      GROUP BY 
        d.id, 
        u."firstName", 
        u."lastName", 
        u."profileImage",
        d.cmp,
        d.rating,
        d."yearsOfExperience",
        d."consultationPrice",
        s.name,
        c.name
      ORDER BY "lastAppointmentDate" DESC
    `;

    const duration = Date.now() - startTime;
    this.logger.log(
      `Query completed in ${duration}ms. Found ${doctors.length} doctor(s)`,
    );

    // Transformar resultado a DTO
    const result: MyDoctorDto[] = doctors.map((doc) => ({
      doctorId: doc.doctorId,
      firstName: doc.firstName,
      lastName: doc.lastName,
      fullName: `${doc.firstName} ${doc.lastName}`,
      profileImage: doc.profileImage,
      cmp: doc.cmp,
      rating: doc.rating,
      yearsOfExperience: doc.yearsOfExperience,
      consultationPrice: doc.consultationPrice,
      specialty: doc.specialtyName,
      clinic: doc.clinicName,
      statistics: {
        totalAppointments: Number(doc.totalAppointments),
        attendedAppointments: Number(doc.attendedAppointments),
        lastAppointmentDate: doc.lastAppointmentDate,
      },
    }));

    return result;
  }
}
