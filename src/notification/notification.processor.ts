import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue/queue.module';
import { NotificationJobData, NotificationType } from './notification.service';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job<NotificationJobData>): Promise<any> {
    this.logger.log(`Processing notification job ${job.id}`);

    try {
      switch (job.data.type) {
        case NotificationType.SMS:
          return await this.sendSMS(job.data);
        case NotificationType.PUSH:
          return await this.sendPushNotification(job.data);
        case NotificationType.IN_APP:
          return await this.createInAppNotification(job.data);
        default:
          throw new Error(`Unknown notification type: ${job.data.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`);
      throw error;
    }
  }

  private async sendSMS(data: NotificationJobData) {
    // Integración con Twilio, SNS, etc.
    this.logger.log(`Sending SMS to user ${data.userId}`);
    // await this.smsProvider.send(...);
    return { success: true, method: 'sms' };
  }

  private async sendPushNotification(data: NotificationJobData) {
    // Integración con Firebase Cloud Messaging, OneSignal, etc.
    this.logger.log(`Sending push notification to user ${data.userId}`);
    // await this.pushProvider.send(...);
    return { success: true, method: 'push' };
  }

  private async createInAppNotification(data: NotificationJobData) {
    // Guardar en base de datos para notificaciones in-app
    this.logger.log(`Creating in-app notification for user ${data.userId}`);
    // await this.prisma.notification.create(...);
    return { success: true, method: 'in_app' };
  }
}
