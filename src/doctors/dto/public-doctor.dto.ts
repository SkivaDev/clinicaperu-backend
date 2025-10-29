import { ApiProperty } from '@nestjs/swagger';

export class PublicDoctorListDto {
  @ApiProperty({ description: 'ID del doctor' })
  id: string;

  @ApiProperty({ description: 'CMP del doctor' })
  cmp: number;

  @ApiProperty({ description: 'Años de experiencia' })
  yearsOfExperience: number | null;

  @ApiProperty({ description: 'Precio de consulta' })
  consultationPrice: number | null;

  @ApiProperty({ description: 'Número de pacientes atendidos' })
  attendedPatients: number;

  @ApiProperty({ description: 'Rating promedio del doctor' })
  rating?: number;

  // @ApiProperty({ description: 'Attended appointments' })
  // attendedAppointments?: number;

  // @ApiProperty({ description: 'Total appointments' })
  // totalAppointments?: number;

  @ApiProperty({ description: 'Usuario del doctor' })
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage: string | null;
    email: string;
    phone: string | null;
  };

  @ApiProperty({ description: 'Especialidad del doctor' })
  specialty: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'Clínica del doctor' })
  clinic: {
    id: string;
    name: string;
  };

  // @ApiProperty({ description: 'Número de citas totales' })
  // totalAppointments?: number;
}

export class PublicDoctorDetailDto extends PublicDoctorListDto {
  // @ApiProperty({ description: 'Email del doctor' })
  // email: string;

  // @ApiProperty({ description: 'Teléfono del doctor' })
  // phone?: string;

  // @ApiProperty({ description: 'Imagen del doctor' })
  // image?: string;

  @ApiProperty({ description: 'Horarios de atención' })
  schedules?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}
