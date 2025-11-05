import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import type {
  IEmailProvider,
  EmailSendResult,
  EmailProviderConfig,
} from '../interfaces/email-provider.interface';
import { EmailProviderType } from '../interfaces/email-provider.interface';

@Injectable()
export class ResendEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private resend: Resend;
  private config: EmailProviderConfig;

  constructor(config: EmailProviderConfig) {
    this.config = config;
    this.validateConfig();
    this.resend = new Resend(this.config.apiKey);
  }

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('RESEND_API_KEY is required for ResendEmailProvider');
    }
    if (!this.config.fromEmail) {
      throw new Error('RESEND_FROM_EMAIL is required for ResendEmailProvider');
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    from?: string,
  ): Promise<EmailSendResult> {
    try {
      const fromEmail = from || this.config.fromEmail || 'clinicaperu@resend.dev';

      this.logger.debug(`Sending email via Resend: ${subject} to ${to}`);

      const result = await this.resend.emails.send({
        from: fromEmail,
        to: [to],
        subject,
        html,
      });

      const sendResult: EmailSendResult = {
        messageId: result.data?.id,
        providerResponse: result,
        sentAt: new Date(),
        metadata: {
          provider: EmailProviderType.RESEND,
        },
      };

      this.logger.log(`✅ Email sent via Resend: ${subject} to ${to} (ID: ${sendResult.messageId})`);
      return sendResult;
    } catch (error) {
      this.logger.error(`❌ Resend email failed: ${error.message}`, error.stack);

      // Handle specific Resend errors
      if (error.statusCode) {
        switch (error.statusCode) {
          case 401:
            throw new Error('Resend API key is invalid or expired');
          case 429:
            throw new Error('Resend rate limit exceeded');
          case 422:
            throw new Error('Invalid email data provided to Resend');
          default:
            throw new Error(`Resend API error (${error.statusCode}): ${error.message}`);
        }
      }

      throw error;
    }
  }

  async sendWithTemplate(
    to: string,
    templateId: string,
    variables: Record<string, any>,
    from?: string,
  ): Promise<EmailSendResult> {
    // Note: Resend templates are handled differently than expected
    // For now, we'll render the template locally and send as HTML
    // TODO: Implement proper Resend template handling when API supports it

    this.logger.warn(`⚠️ Template emails via Resend are not fully implemented. Using HTML fallback for template: ${templateId}`);

    // For now, create a simple HTML representation of the template variables
    const html = `
      <h2>Template Email: ${templateId}</h2>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
        <h3>Template Variables:</h3>
        <pre style="background: white; padding: 10px; border-radius: 4px;">${JSON.stringify(variables, null, 2)}</pre>
      </div>
      <p><em>This email was sent using a template. Contact support if you see this message.</em></p>
    `;

    const subject = `Template: ${templateId}`;

    return this.sendEmail(to, subject, html, from);
  }

  getProviderName(): string {
    return EmailProviderType.RESEND;
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Resend doesn't have a direct health check endpoint
      // We'll do a basic validation by checking if we can instantiate the client
      return !!(this.resend && this.config.apiKey);
    } catch (error) {
      this.logger.error('ResendEmailProvider health check failed', error);
      return false;
    }
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<EmailProviderConfig, 'apiKey'> {
    return {
      fromEmail: this.config.fromEmail,
      options: this.config.options,
    };
  }
}
