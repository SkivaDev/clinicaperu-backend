import { Controller, Post, Body, UseGuards, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/user.decorator';
import type { CurrentUserPayload } from 'src/auth/types/current-user.interface';
import { S3Service } from 'src/common/s3/s3.service';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { ResponseDto } from 'src/common/dto/response.dto';

/**
 * HU-028: Controlador para gestionar uploads a S3
 */
@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private readonly s3Service: S3Service) {}

  /**
   * POST /uploads/generate-presigned-url
   * Genera una URL prefirmada para que el frontend suba la imagen directamente a S3
   */
  @Post('generate-presigned-url')
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 uploads por minuto
  @ApiOperation({
    summary: 'Generar URL prefirmada para subir archivo',
    description:
      'Genera una URL temporal (5 min) para que el frontend suba una imagen de perfil directamente a S3. Retorna la URL de subida y la key del archivo.',
  })
  @ApiOkResponse({
    description: 'URL generada exitosamente',
    schema: {
      example: {
        statusCode: 200,
        message: 'Upload URL generated successfully',
        data: {
          uploadUrl:
            'https://s3.amazonaws.com/bucket/profile-images/user-id/uuid-filename.jpg?X-Amz-...',
          key: 'profile-images/user-id/uuid-filename.jpg',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado',
  })
  @ApiBadRequestResponse({
    description: 'Tipo de archivo no válido (solo imágenes permitidas)',
  })
  async generateUploadUrl(
    @Body() dto: GenerateUploadUrlDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ResponseDto<{ uploadUrl: string; key: string }>> {
    const { uploadUrl, key } = await this.s3Service.generateUploadUrl(
      user.userId,
      dto.fileName,
      dto.fileType,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Upload URL generated successfully',
      data: { uploadUrl, key },
    };
  }
}
