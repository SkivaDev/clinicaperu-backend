import { IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SimulatedCardDto } from './simulated-card.dto';

export class ProcessPaymentDto {
  @ApiProperty({
    description: 'Datos de la tarjeta simulada',
    type: SimulatedCardDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => SimulatedCardDto)
  simulatedCardData: SimulatedCardDto;
}
