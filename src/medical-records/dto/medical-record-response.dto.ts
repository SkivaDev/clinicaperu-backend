import { ApiProperty } from '@nestjs/swagger';
import { RecordType } from './create-medical-record.dto';

export class DoctorInfoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  cmp: number;

  @ApiProperty()
  specialty: string;
}

export class AppointmentInfoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  date: Date;
}

export class AttachmentDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  uploadedAt: Date;

  @ApiProperty()
  size: number;
}

export class MedicalRecordResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  recordDate: Date;

  @ApiProperty({ enum: RecordType })
  recordType: string;

  @ApiProperty()
  diagnosis: string;

  @ApiProperty({ required: false })
  prescription?: string;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  vitalSigns?: any;

  @ApiProperty({ type: [AttachmentDto] })
  attachments: AttachmentDto[];

  @ApiProperty({ type: DoctorInfoDto })
  doctor: DoctorInfoDto;

  @ApiProperty({ type: AppointmentInfoDto })
  appointment: AppointmentInfoDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MedicalRecordListResponseDto {
  @ApiProperty({ type: [MedicalRecordResponseDto] })
  records: MedicalRecordResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
