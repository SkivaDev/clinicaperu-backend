import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MedicalRecordAccessService {
  private readonly logger = new Logger(MedicalRecordAccessService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un acceso a un expediente médico para auditoría
   */
  async logAccess(
    recordId: string,
    userId: string,
    action: string,
    metadata?: any,
  ): Promise<void> {
    try {
      await this.prisma.medicalRecordAccessLog.create({
        data: {
          recordId,
          userId,
          action,
          metadata: metadata || null,
        },
      });

      this.logger.log(
        `Access logged: userId=${userId}, recordId=${recordId}, action=${action}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log access: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // No lanzamos error para no interrumpir el flujo principal
    }
  }

  /**
   * Obtiene el historial de accesos de un expediente
   */
  async getAccessHistory(recordId: string) {
    return this.prisma.medicalRecordAccessLog.findMany({
      where: { recordId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
