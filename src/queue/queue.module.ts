// src/queue/queue.module.ts
import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

// Nombres de las colas - centralizados
export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  PDF: 'pdf',
  REPORT: 'report',
  APPOINTMENT_REMINDER: 'appointment-reminder',
} as const;

@Global() // Hace que el módulo esté disponible globalmente
@Module({
  imports: [
    // Configuración global de BullMQ con Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (redisUrl) {
          const url = new URL(redisUrl);

          return {
            connection: {
              host: url.hostname,
              port: url.port ? Number(url.port) : 6379,
              username: url.username || undefined,
              password: url.password || undefined,
              maxRetriesPerRequest: null, // Recomendado para BullMQ
            },
          };
        }

        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = Number(configService.get<string>('REDIS_PORT', '6379'));
        const username = configService.get<string>('REDIS_USERNAME');
        const password = configService.get<string>('REDIS_PASSWORD');

        return {
          connection: {
            host,
            port,
            username,
            password,
            maxRetriesPerRequest: null, // Recomendado para BullMQ
          },
        };
      },
      inject: [ConfigService],
    }),

    // Registrar todas las colas con configuración por defecto
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.EMAIL,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000, // 3s, 9s, 27s
          },
          removeOnComplete: {
            count: 100,
            age: 86400, // 24 horas
          },
          removeOnFail: {
            count: 500,
            age: 604800, // 7 días
          },
        },
      },
      {
        name: QUEUE_NAMES.NOTIFICATION,
        defaultJobOptions: {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            count: 50,
            age: 43200, // 12 horas
          },
          removeOnFail: {
            count: 200,
          },
        },
      },
      {
        name: QUEUE_NAMES.PDF,
        defaultJobOptions: {
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
          removeOnComplete: {
            count: 50,
            age: 86400,
          },
          removeOnFail: {
            count: 100,
          },
        },
      },
      {
        name: QUEUE_NAMES.REPORT,
        defaultJobOptions: {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
          removeOnComplete: {
            count: 30,
            age: 86400,
          },
          removeOnFail: {
            count: 50,
          },
        },
      },
      {
        name: QUEUE_NAMES.APPOINTMENT_REMINDER,
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 60000, // 1 minuto
          },
          removeOnComplete: {
            count: 200,
            age: 172800, // 48 horas
          },
          removeOnFail: {
            count: 500,
          },
        },
      },
    ),

    // Bull Board - UI para monitorear todas las colas
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    // Registrar todas las colas en Bull Board
    BullBoardModule.forFeature(
      { name: QUEUE_NAMES.EMAIL, adapter: BullMQAdapter },
      { name: QUEUE_NAMES.NOTIFICATION, adapter: BullMQAdapter },
      { name: QUEUE_NAMES.PDF, adapter: BullMQAdapter },
      { name: QUEUE_NAMES.REPORT, adapter: BullMQAdapter },
      { name: QUEUE_NAMES.APPOINTMENT_REMINDER, adapter: BullMQAdapter },
    ),
  ],
  exports: [BullModule], // Exportar para uso en otros módulos
})
export class QueueModule {}
