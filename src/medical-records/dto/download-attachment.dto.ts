import { ApiProperty } from '@nestjs/swagger';

export class DownloadUrlResponseDto {
  @ApiProperty({
    description: 'URL prefirmada para descargar el archivo',
  })
  downloadUrl: string;

  @ApiProperty({
    description: 'Tiempo de expiración en segundos',
  })
  expiresIn: number;
}
