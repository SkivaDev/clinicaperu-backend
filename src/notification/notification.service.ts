import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../queue/queue.module';

export enum NotificationType {
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export interface NotificationJobData {
  type: NotificationType;
  userId: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private notificationQueue: Queue<NotificationJobData>,
  ) {}

  async sendNotification(data: NotificationJobData) {
    return this.notificationQueue.add('send-notification', data, {
      priority: data.type === NotificationType.SMS ? 1 : 5,
    });
  }

  async sendBulkNotifications(notifications: NotificationJobData[]) {
    const jobs = notifications.map((data) => ({
      name: 'send-notification',
      data,
    }));

    return this.notificationQueue.addBulk(jobs);
  }

  async scheduleNotification(data: NotificationJobData, scheduledTime: Date) {
    return this.notificationQueue.add('send-notification', data, {
      delay: scheduledTime.getTime() - Date.now(),
    });
  }
}
