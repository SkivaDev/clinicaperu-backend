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
    // Generar key única: public/profile-images/<userId>/<uuid>-<fileName>
    const sanitizedFileName = this.sanitizeFileName(fileName);
    const uniqueFileName = `${uuidv4()}-${sanitizedFileName}`;
    // Key real que se usará en S3 QUE ES LA RUTA EN AWS
    const s3Key = `public/profile-images/${userId}/${uniqueFileName}`;
    // Key limpio que guardará el frontend / DB
    const publicKey = `profile-images/${userId}/${uniqueFileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
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

      this.logger.log(`Generated upload URL for user ${userId}: ${publicKey}`);

      return { uploadUrl, key: publicKey };
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
   * @param key - La clave del objeto en S3 (sin prefijo public/private)
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
   * Genera una URL prefirmada para SUBIR archivos privados (medical records)
   * Estos archivos van a la carpeta private/ y requieren URLs prefirmadas para acceso
   *
   * @param recordId - ID del expediente médico
   * @param fileName - Nombre original del archivo
   * @param fileType - MIME type (ej: application/pdf, image/jpeg)
   * @param expiresIn - Tiempo de expiración en segundos (default: 300 = 5 min)
   * @returns { uploadUrl, key }
   */
  async generatePrivateUploadUrl(
    recordId: string,
    fileName: string,
    fileType: string,
    expiresIn: number = 300,
  ): Promise<{ uploadUrl: string; key: string }> {
    const sanitizedFileName = this.sanitizeFileName(fileName);
    const uniqueFileName = `${uuidv4()}-${sanitizedFileName}`;
    // Key real en S3 con prefijo private/
    const s3Key = `private/medical-records/${recordId}/${uniqueFileName}`;
    // Key que se guardará en la DB (sin prefijo private/ para consistencia)
    const privateKey = `medical-records/${recordId}/${uniqueFileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      ContentType: fileType,
      Metadata: {
        recordId,
        uploadedAt: new Date().toISOString(),
      },
    });

    try {
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(
        `Generated private upload URL for record ${recordId}: ${privateKey}`,
      );

      return { uploadUrl, key: privateKey };
    } catch (error) {
      this.logger.error(
        `Failed to generate private upload URL: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new Error('Failed to generate private upload URL');
    }
  }

  /**
   * Genera una URL prefirmada para DESCARGAR archivos privados (medical records)
   * Agrega el prefijo private/ automáticamente
   *
   * @param key - La clave del objeto (sin prefijo private/)
   * @param expiresIn - Tiempo de expiración en segundos (default: 900 = 15 min)
   * @returns URL prefirmada
   */
  async generatePrivateDownloadUrl(
    key: string,
    expiresIn: number = 900,
  ): Promise<string | null> {
    // Agregar prefijo private/ si el key es de medical records
    const s3Key = key.startsWith('medical-records/') ? `private/${key}` : key;

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    try {
      const downloadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      this.logger.log(`Generated private download URL for key: ${s3Key}`);

      return downloadUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate private download URL for key ${s3Key}: ${(error as Error).message}`,
        (error as Error).stack,
      );
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
