import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkCashPaidDto {
  @ApiProperty({
    description: 'Notas adicionales sobre el pago en efectivo',
    example: 'Pago recibido en efectivo por recepcionista María',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
