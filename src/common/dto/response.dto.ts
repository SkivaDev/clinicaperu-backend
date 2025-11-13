// export class ResponseDto<T> {
//   statusCode: number;
//   message: string;
//   data?: T;
//   error?: string;
//   pagination?: {
//     total: number;
//     page: number;
//     totalPages: number;
//   };
//   meta?: {
//     totalCount: number;
//     pageCount: number;
//     currentPage: number;
//     perPage: number;
//     hasNextPage: boolean;
//     hasPrevPage: boolean;
//   };
// }

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from './pagination-meta.dto';

export class ResponseDto<T> {
  @ApiProperty({ description: 'Código de estado HTTP' })
  statusCode: number;

  @ApiProperty({ description: 'Mensaje descriptivo de la respuesta' })
  message: string;

  @ApiPropertyOptional({ description: 'Datos de la respuesta' })
  data?: T;

  @ApiPropertyOptional({ description: 'Mensaje de error (si aplica)' })
  error?: string;

  @ApiPropertyOptional({ description: 'Datos estadísticos' })
  stats?: any;

  @ApiPropertyOptional({
    description: 'Metadatos de paginación',
    type: PaginationMetaDto,
  })
  meta?: PaginationMetaDto;

  @ApiPropertyOptional({ description: 'Timestamp de la respuesta' })
  timestamp?: string;
}
