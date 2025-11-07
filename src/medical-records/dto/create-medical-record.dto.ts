import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum RecordType {
  CONSULTATION = 'CONSULTATION',
  FOLLOW_UP = 'FOLLOW_UP',
  EMERGENCY = 'EMERGENCY',
}

export class VitalSignsDto {
  @ApiProperty({ example: '120/80', required: false })
  @IsOptional()
  @IsString()
  bloodPressure?: string;

  @ApiProperty({ example: 75, required: false })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(200)
  heartRate?: number;

  @ApiProperty({ example: 36.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(45)
  temperature?: number;

  @ApiProperty({ example: 70, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(300)
  weight?: number;

  @ApiProperty({ example: 170, required: false })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(250)
  height?: number;
}

export class CreateMedicalRecordDto {
  @ApiProperty({ example: 'uuid', description: 'ID de la cita atendida' })
  @IsUUID()
  appointmentId: string;

  @ApiProperty({
    enum: RecordType,
    example: RecordType.CONSULTATION,
  })
  @IsEnum(RecordType)
  recordType: RecordType;

  @ApiProperty({
    example: 'Paciente presenta cuadro de hipertensión arterial...',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  diagnosis: string;

  @ApiProperty({
    example: 'Enalapril 10mg cada 12 horas...',
    required: false,
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  prescription?: string;

  @ApiProperty({
    example: 'Paciente debe retornar en 15 días...',
    required: false,
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiProperty({
    type: VitalSignsDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VitalSignsDto)
  vitalSigns?: VitalSignsDto;
}
