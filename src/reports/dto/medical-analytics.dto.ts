import { ApiProperty } from '@nestjs/swagger';

export class DiagnosisDataDto {
  @ApiProperty({ description: 'Diagnosis name' })
  name: string;

  @ApiProperty({ description: 'Number of occurrences' })
  count: number;
}

export class ConsultationTypeDataDto {
  @ApiProperty({ description: 'Type name' })
  subject: string;

  @ApiProperty({ description: 'Count of this type' })
  A: number;

  @ApiProperty({ description: 'Maximum value for scale' })
  fullMark: number;
}

export class AppointmentsBySpecialtyDto {
  @ApiProperty({ description: 'Specialty name' })
  name: string;

  @ApiProperty({ description: 'Number of appointments' })
  count: number;
}

export class MedicalAnalyticsDto {
  @ApiProperty({ description: 'Top diagnoses', type: [DiagnosisDataDto] })
  topDiagnoses: DiagnosisDataDto[];

  @ApiProperty({ description: 'Consultation types distribution', type: [ConsultationTypeDataDto] })
  consultationTypes: ConsultationTypeDataDto[];

  @ApiProperty({ description: 'Appointments by specialty', type: [AppointmentsBySpecialtyDto] })
  appointmentsBySpecialty: AppointmentsBySpecialtyDto[];
}
