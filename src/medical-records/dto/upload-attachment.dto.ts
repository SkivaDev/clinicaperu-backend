import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, MinLength, MaxLength } from 'class-validator';

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export class UploadAttachmentDto {
  @ApiProperty({
    example: 'radiografia.pdf',
    description: 'Nombre del archivo',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName: string;

  @ApiProperty({
    example: 'application/pdf',
    enum: ALLOWED_FILE_TYPES,
    description: 'Tipo MIME del archivo',
  })
  @IsString()
  @IsIn(ALLOWED_FILE_TYPES)
  fileType: string;
}

export class UploadUrlResponseDto {
  @ApiProperty()
  uploadUrl: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  expiresIn: number;
}
