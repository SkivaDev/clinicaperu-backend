import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SimulatedCardDto {
  @ApiProperty({
    description: 'Número de tarjeta (16 dígitos)',
    example: '4242424242424242',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{16}$/, {
    message: 'Card number must be exactly 16 digits',
  })
  cardNumber: string;

  @ApiProperty({
    description: 'Nombre del titular (mayúsculas)',
    example: 'JUAN PEREZ',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z\s]+$/, {
    message: 'Cardholder name must contain only uppercase letters and spaces',
  })
  cardholderName: string;

  @ApiProperty({
    description: 'Mes de expiración (01-12)',
    example: '12',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])$/, {
    message: 'Expiry month must be between 01 and 12',
  })
  expiryMonth: string;

  @ApiProperty({
    description: 'Año de expiración (últimos 2 dígitos)',
    example: '26',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}$/, {
    message: 'Expiry year must be 2 digits',
  })
  expiryYear: string;

  @ApiProperty({
    description: 'CVV (3-4 dígitos)',
    example: '123',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3,4}$/, {
    message: 'CVV must be 3 or 4 digits',
  })
  cvv: string;
}
