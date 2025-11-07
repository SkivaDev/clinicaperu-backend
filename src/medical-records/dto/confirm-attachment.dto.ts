import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class ConfirmAttachmentDto {
  @ApiProperty({
    example: 'medical-records/uuid/uuid-file.pdf',
    description: 'Key de S3 del archivo subido',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  key: string;

  @ApiProperty({
    example: 'radiografia.pdf',
    description: 'Nombre original del archivo',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 1048576,
    description: 'Tamaño del archivo en bytes',
  })
  @IsNumber()
  @Min(1)
  @Max(10485760) // 10MB
  size: number;
}

export class AttachmentConfirmedResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  attachment: {
    key: string;
    name: string;
    uploadedAt: Date;
    size: number;
  };
}
