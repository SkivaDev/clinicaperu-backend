/**
 * Interface for email providers to ensure consistent API across different email services
 */
export interface IEmailProvider {
  /**
   * Send an email with HTML content
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - HTML content of the email
   * @param from - Optional sender email (defaults to configured from address)
   * @returns Promise with send result
   */
  sendEmail(
    to: string,
    subject: string,
    html: string,
    from?: string,
  ): Promise<EmailSendResult>;

  /**
   * Send an email using a template ID (if supported by provider)
   * @param to - Recipient email address
   * @param templateId - Template identifier
   * @param variables - Template variables
   * @param from - Optional sender email
   * @returns Promise with send result
   */
  sendWithTemplate?(
    to: string,
    templateId: string,
    variables: Record<string, any>,
    from?: string,
  ): Promise<EmailSendResult>;

  /**
   * Get the name/identifier of this provider
   */
  getProviderName(): string;

  /**
   * Check if the provider is properly configured and ready to send emails
   */
  isHealthy(): Promise<boolean>;
}

/**
 * Result of an email send operation
 */
export interface EmailSendResult {
  /** Unique identifier for the sent email (provider-specific) */
  messageId?: string;

  /** Provider-specific response data */
  providerResponse?: any;

  /** Timestamp when the email was sent */
  sentAt?: Date;

  /** Any additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Configuration for email providers
 */
export interface EmailProviderConfig {
  /** API key for authentication */
  apiKey?: string;

  /** Default sender email address */
  fromEmail?: string;

  /** SMTP host (for SMTP-based providers) */
  smtpHost?: string;

  /** SMTP port (for SMTP-based providers) */
  smtpPort?: number;

  /** SMTP username (optional) */
  smtpUser?: string;

  /** SMTP password (optional) */
  smtpPass?: string;

  /** Additional configuration options */
  options?: Record<string, any>;
}

/**
 * Available email providers
 */
export enum EmailProviderType {
  MAILHOG = 'mailhog',
  RESEND = 'resend',
  SENDGRID = 'sendgrid', // Future extension
  SES = 'ses', // Future extension
}
