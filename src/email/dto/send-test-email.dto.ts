import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsObject } from 'class-validator';
import { EmailTemplate } from '@prisma/client';

export class SendTestEmailDto {
  @ApiProperty({
    example: 'patient@test.com',
    description: 'Email address of the recipient',
  })
  @IsEmail()
  to: string;

  @ApiProperty({
    enum: EmailTemplate,
    example: EmailTemplate.BOOKING_CONFIRMATION,
    description: 'Email template to use',
  })
  @IsEnum(EmailTemplate)
  template: EmailTemplate;

  @ApiProperty({
    example: {
      patientName: 'Juan Pérez',
      doctorName: 'Dra. María García',
      specialty: 'Cardiología',
      date: '25 de Octubre, 2025',
      time: '10:00 AM',
      location: 'Clínica Principal, Consultorio 101',
    },
    description: 'Variables to replace in the email template',
  })
  @IsObject()
  variables: Record<string, any>;
}
