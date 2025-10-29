import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class RescheduleAppointmentDto {
  @ApiProperty({
    description: 'ID del nuevo slot al que se desea reprogramar la cita',
    example: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  })
  @IsNotEmpty({ message: 'El ID del nuevo slot es requerido' })
  @IsUUID('4', { message: 'El ID del nuevo slot debe ser un UUID válido' })
  @IsString()
  newSlotId: string;
}
