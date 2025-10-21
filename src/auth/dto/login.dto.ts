import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'DNI del usuario para autenticación',
    example: '12345678',
    minLength: 8,
    maxLength: 8
  })
  @IsString()
  @IsNotEmpty()
  @Length(8)
  dni: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'MiContraseña123!'
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
