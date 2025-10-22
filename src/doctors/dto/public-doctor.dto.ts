import { ApiProperty } from '@nestjs/swagger';

export class PublicDoctorListDto {
  @ApiProperty({ description: 'ID del doctor' })
  id: string;

  @ApiProperty({ description: 'Nombre del doctor' })
  name: string;

  @ApiProperty({ description: 'Apellido del doctor' })
  lastName: string;

  @ApiProperty({ description: 'CMP del doctor' })
  cmp: number;

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

  @ApiProperty({ description: 'Rating promedio del doctor' })
  rating?: number;

  @ApiProperty({ description: 'Número de citas totales' })
  totalAppointments?: number;
}

export class PublicDoctorDetailDto extends PublicDoctorListDto {
  @ApiProperty({ description: 'Email del doctor' })
  email: string;

  @ApiProperty({ description: 'Teléfono del doctor' })
  phone?: string;


  @ApiProperty({ description: 'Imagen del doctor' })
  image?: string;

  @ApiProperty({ description: 'Horarios de atención' })
  schedules?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}
