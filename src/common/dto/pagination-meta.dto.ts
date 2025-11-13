import { ApiProperty } from '@nestjs/swagger';

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
