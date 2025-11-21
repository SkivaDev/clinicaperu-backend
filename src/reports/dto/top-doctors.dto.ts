import { ApiProperty } from '@nestjs/swagger';

export class TopDoctorDto {
  @ApiProperty({ description: 'Doctor ID' })
  id: string;

  @ApiProperty({ description: 'Doctor full name' })
  name: string;

  @ApiProperty({ description: 'Specialty name' })
  specialty: string;

  @ApiProperty({ description: 'Number of unique patients attended' })
  patientsCount: number;

  @ApiProperty({ description: 'Doctor rating' })
  rating: number;

  @ApiProperty({ description: 'Profile image URL', required: false })
  profileImage?: string;

  @ApiProperty({ description: 'Initials for avatar' })
  initials: string;
}

export class TopDoctorsDto {
  @ApiProperty({ description: 'List of top doctors', type: [TopDoctorDto] })
  doctors: TopDoctorDto[];
}
