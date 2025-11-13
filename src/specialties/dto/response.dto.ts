import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Total de registros' })
  total: number;

  @ApiProperty({ description: 'Página actual' })
  page: number;

  @ApiProperty({ description: 'Cantidad de registros por página' })
  limit: number;

  @ApiProperty({ description: 'Total de páginas' })
  totalPages: number;

  @ApiProperty({ description: 'Indica si hay página siguiente' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Indica si hay página anterior' })
  hasPrevPage: boolean;
}

export class ResponseDto<T> {
  @ApiProperty({ description: 'Código de estado HTTP' })
  statusCode: number;

  @ApiProperty({ description: 'Mensaje descriptivo de la respuesta' })
  message: string;

  @ApiPropertyOptional({ description: 'Datos de la respuesta' })
  data?: T;

  @ApiPropertyOptional({ description: 'Mensaje de error (si aplica)' })
  error?: string;

  @ApiPropertyOptional({
    description: 'Metadatos de paginación',
    type: PaginationMetaDto,
  })
  meta?: PaginationMetaDto;

  @ApiPropertyOptional({ description: 'Timestamp de la respuesta' })
  timestamp?: string;
}
