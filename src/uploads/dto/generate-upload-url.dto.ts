import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * HU-028: DTO para generar URL prefirmada de subida a S3
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
}
