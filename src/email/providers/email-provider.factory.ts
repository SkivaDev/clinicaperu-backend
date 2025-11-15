import { Injectable, Logger } from '@nestjs/common';
import {
  IEmailProvider,
  EmailProviderConfig,
  EmailProviderType,
} from '../interfaces/email-provider.interface';
import { ResendEmailProvider } from './resend-email.provider';
import { MailhogEmailProvider } from './mailhog-email.provider';

@Injectable()
export class EmailProviderFactory {
  private readonly logger = new Logger(EmailProviderFactory.name);
  private providers = new Map<EmailProviderType, IEmailProvider>();

  /**
   * Create and configure an email provider based on the provider type
   */
  createProvider(
    providerType: EmailProviderType,
    config: EmailProviderConfig,
  ): IEmailProvider {
    const cacheKey = providerType;

    // Return cached provider if it exists
    if (this.providers.has(cacheKey)) {
      this.logger.debug(`Returning cached ${providerType} provider`);
      const cachedProvider = this.providers.get(cacheKey);
      if (cachedProvider) {
        return cachedProvider;
      }
    }

    let provider: IEmailProvider;

    switch (providerType) {
      case EmailProviderType.RESEND:
        provider = new ResendEmailProvider(config);
        break;

      case EmailProviderType.MAILHOG:
        provider = new MailhogEmailProvider(config);
        break;

      default:
        throw new Error(`Unsupported email provider: ${providerType}`);
    }

    // Cache the provider
    this.providers.set(cacheKey, provider);

    this.logger.log(`✅ Created and cached ${providerType} email provider`);
    return provider;
  }

  /**
   * Create provider based on environment configuration
   */
  createProviderFromEnv(): IEmailProvider {
    const providerType = this.getProviderTypeFromEnv();
    const config = this.buildConfigFromEnv(providerType);

    this.logger.log(`Creating email provider: ${providerType}`);
    return this.createProvider(providerType, config);
  }

  /**
   * Get the provider type from environment variables
   */
  private getProviderTypeFromEnv(): EmailProviderType {
    const providerEnv = process.env.EMAIL_PROVIDER?.toLowerCase();

    switch (providerEnv) {
      case 'resend':
        return EmailProviderType.RESEND;
      case 'mailhog':
      case 'development':
      case 'dev':
        return EmailProviderType.MAILHOG;
      default:
        // Default to MAILHOG for development safety
        this.logger.warn(
          `Unknown EMAIL_PROVIDER "${providerEnv}", defaulting to MAILHOG. ` +
            `Set EMAIL_PROVIDER=resend for production.`,
        );
        return EmailProviderType.MAILHOG;
    }
  }

  /**
   * Build provider configuration from environment variables
   */
  private buildConfigFromEnv(
    providerType: EmailProviderType,
  ): EmailProviderConfig {
    const config: EmailProviderConfig = {};

    switch (providerType) {
      case EmailProviderType.RESEND:
        config.apiKey = process.env.RESEND_API_KEY;
        config.fromEmail =
          process.env.RESEND_FROM_EMAIL || 'clinicaperu@resend.dev';
        if (!config.apiKey) {
          throw new Error(
            'RESEND_API_KEY is required when using RESEND provider',
          );
        }
        break;

      case EmailProviderType.MAILHOG:
        config.smtpHost = process.env.SMTP_HOST || 'localhost';
        config.smtpPort = parseInt(process.env.SMTP_PORT || '1025');
        config.smtpUser = process.env.SMTP_USER; // Optional for MailHog
        config.smtpPass = process.env.SMTP_PASS; // Optional for MailHog
        config.fromEmail = process.env.SMTP_FROM || 'noreply@clinicaperu.local';
        break;
    }

    return config;
  }

  /**
   * Clear all cached providers (useful for testing or reconfiguration)
   */
  clearCache(): void {
    this.providers.clear();
    this.logger.log('Cleared email provider cache');
  }

  /**
   * Get all available provider types
   */
  getAvailableProviders(): EmailProviderType[] {
    return Object.values(EmailProviderType);
  }

  /**
   * Get the currently configured provider type
   */
  getCurrentProviderType(): EmailProviderType {
    return this.getProviderTypeFromEnv();
  }
}
