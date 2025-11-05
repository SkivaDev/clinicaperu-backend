import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';
import { EmailController } from './email.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailProviderFactory } from './providers/email-provider.factory';

@Module({
  imports: [
    PrismaModule,
    // Configure BullMQ connection to local Redis
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    // Register email queue with retry configuration
    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000, // 3s, 9s, 27s
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    // Configure Bull Board for queue monitoring
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'email',
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailProcessor, EmailProviderFactory],
  exports: [EmailService],
})
export class EmailModule {}
