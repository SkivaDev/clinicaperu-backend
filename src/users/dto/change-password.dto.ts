import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

/**
 * HU-028: DTO para cambiar contraseña
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario',
    example: 'CurrentPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description:
      'Nueva contraseña (min 8 chars, 1 mayúscula, 1 minúscula, 1 número)',
    example: 'NewPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmación de la nueva contraseña (debe coincidir)',
    example: 'NewPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
