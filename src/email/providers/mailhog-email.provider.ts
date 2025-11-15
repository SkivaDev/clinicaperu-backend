import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import type {
  IEmailProvider,
  EmailSendResult,
  EmailProviderConfig,
} from '../interfaces/email-provider.interface';
import { EmailProviderType } from '../interfaces/email-provider.interface';

@Injectable()
export class MailhogEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(MailhogEmailProvider.name);
  private transporter: Transporter;
  private config: EmailProviderConfig;

  constructor(config: EmailProviderConfig) {
    this.config = config;
    this.validateConfig();
    this.initializeTransporter();
  }

  private validateConfig(): void {
    if (!this.config.smtpHost) {
      throw new Error('SMTP_HOST is required for MailhogEmailProvider');
    }
    if (!this.config.smtpPort) {
      throw new Error('SMTP_PORT is required for MailhogEmailProvider');
    }
  }

  private initializeTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: false, // MailHog typically doesn't use secure connections
      auth: this.config.smtpUser
        ? {
            user: this.config.smtpUser,
            pass: this.config.smtpPass,
          }
        : undefined, // No auth for MailHog by default
      // Additional options for better debugging
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
    });

    this.logger.log(
      `✅ MailHog email transporter initialized: ${this.config.smtpHost}:${this.config.smtpPort}`,
    );
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    from?: string,
  ): Promise<EmailSendResult> {
    try {
      const fromEmail =
        from || this.config.fromEmail || 'noreply@clinicaperu.local';

      this.logger.debug(`Sending email via MailHog: ${subject} to ${to}`);

      const info = await this.transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
      });

      const sendResult: EmailSendResult = {
        messageId: info.messageId,
        providerResponse: {
          accepted: info.accepted,
          rejected: info.rejected,
          envelope: info.envelope,
          messageId: info.messageId,
        },
        sentAt: new Date(),
        metadata: {
          provider: EmailProviderType.MAILHOG,
        },
      };

      this.logger.log(
        `✅ Email sent via MailHog: ${subject} to ${to} (ID: ${sendResult.messageId})`,
      );
      return sendResult;
    } catch (error) {
      this.logger.error(
        `❌ MailHog email failed: ${error.message}`,
        error.stack,
      );
      throw new Error(`MailHog email delivery failed: ${error.message}`);
    }
  }

  // MailHog doesn't support templates natively, but we can implement basic template support
  async sendWithTemplate(
    to: string,
    templateId: string,
    variables: Record<string, any>,
    from?: string,
  ): Promise<EmailSendResult> {
    // For MailHog, we'll treat templateId as a simple identifier and just send the variables as JSON
    // In a real implementation, you'd have a template engine here
    const subject = `Template: ${templateId}`;
    const html = `
      <h2>Template Email: ${templateId}</h2>
      <pre>${JSON.stringify(variables, null, 2)}</pre>
      <p><em>This is a template email sent via MailHog for testing purposes.</em></p>
    `;

    this.logger.warn(
      `⚠️ Template emails are simplified in MailHog provider: ${templateId}`,
    );

    return this.sendEmail(to, subject, html, from);
  }

  getProviderName(): string {
    return EmailProviderType.MAILHOG;
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Test the transporter connection
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('MailhogEmailProvider health check failed', error);
      return false;
    }
  }

  /**
   * Get the underlying nodemailer transporter (useful for advanced operations)
   */
  getTransporter(): Transporter {
    return this.transporter;
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<EmailProviderConfig, 'apiKey' | 'smtpPass'> {
    return {
      fromEmail: this.config.fromEmail,
      smtpHost: this.config.smtpHost,
      smtpPort: this.config.smtpPort,
      smtpUser: this.config.smtpUser,
      options: this.config.options,
    };
  }
}
