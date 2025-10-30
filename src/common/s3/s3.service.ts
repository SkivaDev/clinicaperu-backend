import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

/**
 * HU-028: S3Service para gestionar URLs prefirmadas
 * Maneja subida y descarga de archivos en AWS S3
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const bucketName = this.configService.get<string>('S3_BUCKET_NAME');

    if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
      this.logger.error('AWS S3 credentials are not properly configured');
      throw new Error('AWS S3 configuration is missing');
    }

    this.bucketName = bucketName;

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(
      `S3Service initialized for bucket: ${this.bucketName} in region: ${region}`,
    );
  }

  /**
   * Genera una URL prefirmada para SUBIR un archivo a S3
   * El frontend usará esta URL para hacer PUT directamente
   *
   * @param userId - ID del usuario (para organizar en folders)
   * @param fileName - Nombre original del archivo
   * @param fileType - MIME type (ej: image/jpeg)
   * @param expiresIn - Tiempo de expiración en segundos (default: 300 = 5 min)
   * @returns { uploadUrl, key }
   */
  async generateUploadUrl(
    userId: string,
    fileName: string,
    fileType: string,
    expiresIn: number = 300, // 5 minutos
  ): Promise<{ uploadUrl: string; key: string }> {
    // Generar key única: profile-images/<userId>/<uuid>-<fileName>
    const sanitizedFileName = this.sanitizeFileName(fileName);
    const uniqueFileName = `${uuidv4()}-${sanitizedFileName}`;
    const key = `profile-images/${userId}/${uniqueFileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: fileType,
      // Metadata opcional
      Metadata: {
        userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    try {
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(`Generated upload URL for user ${userId}: ${key}`);

      return { uploadUrl, key };
    } catch (error) {
      this.logger.error(
        `Failed to generate upload URL: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Genera una URL prefirmada para DESCARGAR un archivo desde S3
   * Se usa para mostrar la imagen de perfil en el frontend
   *
   * @param key - La clave del objeto en S3
   * @param expiresIn - Tiempo de expiración en segundos (default: 300 = 5 min)
   * @returns URL prefirmada para descargar o null si falla
   */
  async generateDownloadUrl(
    key: string,
    expiresIn: number = 300, // 5 minutos
  ): Promise<string | null> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const downloadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(`Generated download URL for key: ${key}`);

      return downloadUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate download URL for key ${key}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // No lanzar error, solo retornar null
      // Esto permite que el perfil se muestre sin imagen si falla
      return null;
    }
  }

  /**
   * Elimina un archivo de S3
   * Útil cuando un usuario cambia su foto de perfil
   *
   * @param key - La clave del objeto a eliminar
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`Deleted file from S3: ${key}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete file ${key}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // No lanzar error crítico, solo loggearlo
    }
  }

  /**
   * Sanitiza el nombre del archivo para evitar problemas de seguridad
   * Elimina caracteres especiales y espacios
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Reemplazar caracteres especiales
      .replace(/\s+/g, '_') // Reemplazar espacios
      .toLowerCase();
  }
}
