import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from './email.service';
import { EmailStatus, EmailTemplate } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

interface EmailJobData {
  emailId: string;
  to: string;
  template: EmailTemplate;
  variables: Record<string, any>;
}

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { emailId, to, template, variables } = job.data;

    this.logger.log(
      `📨 Processing email job: ${template} to ${to} (ID: ${emailId}, Attempt: ${job.attemptsMade + 1}/3)`,
    );

    try {
      // Get email message from database
      const emailMessage = await this.prisma.emailMessage.findUnique({
        where: { id: emailId },
      });

      if (!emailMessage) {
        throw new Error(`Email message not found: ${emailId}`);
      }

      // Increment attempts in database
      await this.prisma.emailMessage.update({
        where: { id: emailId },
        data: {
          attempts: { increment: 1 },
          status: EmailStatus.RETRYING,
        },
      });

      // Render HTML template
      const html = this.emailService.renderTemplate(template, variables);
      const subject = this.emailService.getSubject(template);

      // Send email using the configured provider
      const emailProvider = this.emailService.getEmailProvider();
      await emailProvider.sendEmail(to, subject, html);

      // Update database: SUCCESS
      await this.prisma.emailMessage.update({
        where: { id: emailId },
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date(),
        },
      });

      this.logger.log(`✅ Email sent: ${template} to ${to} (ID: ${emailId})`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `❌ Email failed: ${template} to ${to} (ID: ${emailId}) - ${errorMessage}`,
      );

      // Get current attempts
      const emailMessage = await this.prisma.emailMessage.findUnique({
        where: { id: emailId },
      });

      const currentAttempts = emailMessage?.attempts || 0;

      // Update database with error
      if (currentAttempts >= 3) {
        // Max attempts reached - mark as FAILED
        await this.prisma.emailMessage.update({
          where: { id: emailId },
          data: {
            status: EmailStatus.FAILED,
            lastError: errorMessage,
          },
        });

        this.logger.error(
          `❌ Email failed after 3 attempts: ${template} to ${to} (ID: ${emailId})`,
        );
      } else {
        // Will retry - keep as RETRYING
        await this.prisma.emailMessage.update({
          where: { id: emailId },
          data: {
            status: EmailStatus.RETRYING,
            lastError: errorMessage,
          },
        });

        this.logger.warn(
          `⚠️ Email will retry: ${template} to ${to} (ID: ${emailId}) - Attempt ${currentAttempts}/3`,
        );
      }

      // Re-throw error so BullMQ can handle retry logic
      throw error;
    }
  }
}
