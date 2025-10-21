import { IsBoolean, IsInt, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDoctorDto {
  @ApiProperty({
    description: 'Número de colegiatura médica profesional',
    example: 12345,
    type: 'integer'
  })
  @IsInt()
  cmp: number;

  @ApiPropertyOptional({
    description: 'Estado activo del doctor',
    example: true,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Años de experiencia del doctor',
    example: 5,
    type: 'number'
  })
  @IsNumber()
  @IsOptional()
  yearsOfExperience: number;

  @ApiPropertyOptional({
    description: 'Precio de consulta del doctor',
    example: 150.00,
    type: 'number'
  })
  @IsNumber()
  @IsOptional()
  consultationPrice: number;

  @ApiProperty({
    description: 'ID de la especialidad del doctor',
    example: 'uuid-specialty-id'
  })
  @IsString()
  specialtyId: string;

  @ApiProperty({
    description: 'ID de la clínica donde trabaja el doctor',
    example: 'uuid-clinic-id'
  })
  @IsString()
  clinicId: string;
}
