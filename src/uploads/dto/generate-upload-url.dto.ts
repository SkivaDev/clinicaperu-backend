import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

/**
 * HU-028: DTO para generar URL prefirmada de subida a S3
 * ✅ SEGURIDAD: Solo permite imágenes y tamaño máximo de 5MB
 */
export class GenerateUploadUrlDto {
  @ApiProperty({
    description: 'Nombre del archivo',
    example: 'profile-photo.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: 'Tipo MIME del archivo (solo imágenes permitidas)',
    example: 'image/jpeg',
    enum: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^image\/(jpeg|jpg|png|webp)$/, {
    message: 'Only image files (JPEG, PNG, WEBP) are allowed',
  })
  fileType: string;

  @ApiProperty({
    description: 'Tamaño del archivo en bytes (máximo 5MB)',
    example: 1048576,
    minimum: 1,
    maximum: 5242880, // 5MB
  })
  @IsNumber()
  @Min(1, { message: 'File size must be at least 1 byte' })
  @Max(5242880, { message: 'File size must not exceed 5MB (5242880 bytes)' })
  fileSize: number;
}
