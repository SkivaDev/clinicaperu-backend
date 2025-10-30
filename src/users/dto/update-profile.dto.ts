import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * HU-028: DTO para actualizar perfil de usuario
 * Permite actualizar datos básicos y la key de la imagen de perfil
 */
export class UpdateProfileDto {
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Pérez García',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({
    description: 'Email del usuario (debe ser único)',
    example: 'juan.perez@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Teléfono del usuario',
    example: '+51987654321',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in valid international format',
  })
  phone?: string;

  @ApiProperty({
    description:
      'Key del archivo de imagen de perfil en S3 (retornada por /uploads/generate-presigned-url)',
    example: 'profile-images/user-id/uuid-filename.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^profile-images\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+$/, {
    message: 'Profile image key must be a valid S3 key format',
  })
  profileImageKey?: string;
}
