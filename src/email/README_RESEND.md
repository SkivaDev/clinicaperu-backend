# 📧 Resend Email Implementation

This document explains the Resend email implementation for Clínica Perú backend.

## 🏗️ Architecture

The email system uses a provider pattern that allows switching between different email services without changing the core logic:

```
EmailService (uses) → EmailProviderFactory → IEmailProvider
                                       ↓
                              ┌─────────┴─────────┐
                              │                  │
            MailhogProvider    ResendProvider
                   │                  │
            nodemailer           resend
```

## 📁 File Structure

```
src/email/
├── interfaces/
│   └── email-provider.interface.ts    # Provider contract
├── providers/
│   ├── email-provider.factory.ts      # Provider factory
│   ├── mailhog-email.provider.ts      # MailHog implementation
│   └── resend-email.provider.ts       # Resend implementation
│   └── index.ts                       # Exports
├── dto/
│   └── send-test-email.dto.ts         # Test email DTO
├── email.controller.ts                # REST endpoints
├── email.service.ts                   # Core email service
├── email.processor.ts                 # BullMQ job processor
├── email.module.ts                    # NestJS module
└── README_RESEND.md                   # This file
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm add resend
```

### 2. Configure Environment
```bash
# For development (MailHog)
EMAIL_PROVIDER=mailhog
SMTP_HOST=localhost
SMTP_PORT=1025

# For production (Resend)
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@clinicaperu.com
```

### 3. Test Email Sending

## 🎯 Cómo Elegir Email Provider

### Variable Principal: `EMAIL_PROVIDER`

El sistema lee esta variable para determinar qué provider usar:

```bash
# Valores válidos:
EMAIL_PROVIDER=mailhog    # Para desarrollo
EMAIL_PROVIDER=resend     # Para producción
EMAIL_PROVIDER=dev        # Alias para mailhog
EMAIL_PROVIDER=development # Alias para mailhog

# Si no se especifica o es inválido → usa MAILHOG por defecto
```

### Configuración por Ambiente

#### **Desarrollo (.env.local o .env):**
```bash
EMAIL_PROVIDER=mailhog
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@clinicaperu.local
```

#### **Producción (.env.production):**
```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_1234567890abcdef
RESEND_FROM_EMAIL=clinicaperu@resend.dev
```

**Nota:** Cada provider usa su propia variable de `fromEmail`:
- **MailHog**: `SMTP_FROM`
- **Resend**: `RESEND_FROM_EMAIL`

#### **Staging (.env.staging):**
```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_staging_key_abcdef
RESEND_FROM_EMAIL=staging@resend.dev
```

### Cambio Rápido Entre Providers

```bash
# Solo cambia esta línea en tu .env
EMAIL_PROVIDER=resend  # ← Cambiar aquí

# Reinicia la aplicación
pnpm run start:dev
```

### Verificación del Provider Activo

El sistema registra qué provider está usando:

```
✅ Email service initialized with MAILHOG provider
✅ Email service initialized with RESEND provider
```

### 3. Test Email Sending
```bash
curl -X POST http://localhost:3000/email-test/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "template": "BOOKING_CONFIRMATION",
    "variables": {
      "patientName": "Juan Pérez",
      "doctorName": "Dra. María García",
      "specialty": "Cardiología",
      "date": "25 de Octubre, 2025",
      "time": "10:00 AM",
      "location": "Clínica Principal"
    }
  }'
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `EMAIL_PROVIDER` | Email provider (`mailhog` or `resend`) | `mailhog` | No |
| `SMTP_HOST` | SMTP server host (MailHog) | `localhost` | Yes (MailHog) |
| `SMTP_PORT` | SMTP server port (MailHog) | `1025` | Yes (MailHog) |
| `SMTP_FROM` | From email address (MailHog) | `noreply@clinicaperu.com` | No |
| `RESEND_API_KEY` | Resend API key | - | Yes (Resend) |
| `RESEND_FROM_EMAIL` | From email address (Resend) | `noreply@clinicaperu.com` | No |

### Resend Setup

1. **Create Resend Account**: Go to [resend.com](https://resend.com) and create an account
2. **Get API Key**: Navigate to API Keys section and create a new key
3. **Verify Domain**: Add and verify your domain for better deliverability
4. **Configure Environment**: Add the API key to your production environment

## 📊 Features

### Provider Features

| Feature | MailHog | Resend |
|---------|---------|--------|
| HTML Templates | ✅ | ✅ |
| Template Variables | ✅ | ✅ |
| Retry Logic | ✅ | ✅ |
| Health Checks | ✅ | ✅ |
| Error Handling | ✅ | ✅ |
| Analytics | ❌ | ✅ |
| Bounce Handling | ❌ | ✅ |

### Error Handling

The system handles different error types:

- **Rate Limiting**: Automatic retry with exponential backoff
- **Invalid API Key**: Clear error messages for Resend
- **Network Issues**: BullMQ retry mechanism
- **Template Errors**: Validation of required variables

### Monitoring

- **Health Checks**: Each provider implements `isHealthy()` method
- **Logging**: Comprehensive logging for debugging
- **Database Tracking**: All email attempts stored in `EmailMessage` table
- **Bull Board**: Queue monitoring at `/admin/queues`

## 🧪 Testing

### Unit Tests
```typescript
// Example test for ResendProvider
describe('ResendEmailProvider', () => {
  it('should send email successfully', async () => {
    const provider = new ResendEmailProvider({
      apiKey: 'test-key',
      fromEmail: 'test@example.com',
    });

    const result = await provider.sendEmail(
      'to@example.com',
      'Test Subject',
      '<h1>Test</h1>',
    );

    expect(result.messageId).toBeDefined();
  });
});
```

### Integration Tests
```typescript
// Test with actual providers
describe('Email Integration', () => {
  it('should send email via configured provider', async () => {
    const emailService = app.get(EmailService);
    const emailId = await emailService.enqueueEmail(
      'test@example.com',
      EmailTemplate.WELCOME,
      { userName: 'Test User' },
    );

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const status = await emailService.getEmailStatus(emailId);
    expect(status.status).toBe(EmailStatus.SENT);
  });
});
```

## 🔒 Security Considerations

1. **API Keys**: Never commit Resend API keys to version control
2. **Environment Variables**: Use different keys for different environments
3. **Rate Limiting**: Resend has built-in rate limiting (100 emails/minute free tier)
4. **Domain Verification**: Verify domains in Resend for better deliverability

## 🚦 Migration Strategy

### From MailHog to Resend

1. **Keep MailHog for Development**: Don't change dev environment
2. **Add Resend Configuration**: Update production environment variables
3. **Test in Staging**: Deploy to staging with Resend first
4. **Gradual Rollout**: Switch production gradually
5. **Monitor**: Watch error rates and delivery metrics

### Environment Example

```bash
# .env.local (development)
EMAIL_PROVIDER=mailhog

# .env.staging (staging with Resend)
EMAIL_PROVIDER=resend
RESEND_API_KEY=staging-key

# .env.prod (production with Resend)
EMAIL_PROVIDER=resend
RESEND_API_KEY=production-key
```

## 📈 Performance & Scalability

### BullMQ Configuration
- **Concurrency**: Default 1 worker per queue
- **Retries**: 3 attempts with exponential backoff (3s, 9s, 27s)
- **Cleanup**: Auto-remove completed jobs after 100, failed after 500

### Resend Limits (Free Tier)
- **Emails/Month**: 3,000
- **Emails/Minute**: 100
- **Domains**: 1 verified domain

### Optimization Tips
1. **Batch Emails**: Consider batching for high-volume scenarios
2. **Template Caching**: Cache compiled templates if needed
3. **Connection Pooling**: Resend handles connection optimization
4. **Monitoring**: Set up alerts for high error rates

## 🐛 Troubleshooting

### Common Issues

**Resend API Key Invalid**
```
Error: Resend API key is invalid or expired
Solution: Check RESEND_API_KEY in environment variables
```

**Rate Limit Exceeded**
```
Error: Resend rate limit exceeded
Solution: Implement email queuing or upgrade Resend plan
```

**Template Variables Missing**
```
Error: Missing required variables for template BOOKING_CONFIRMATION
Solution: Check template requirements in EmailService.validateTemplateVariables()
```

**Provider Not Healthy**
```
Warning: Email provider health check failed
Solution: Check network connectivity and provider credentials
```

## 📚 API Reference

### EmailService

```typescript
class EmailService {
  // Enqueue email for sending
  enqueueEmail(to: string, template: EmailTemplate, variables: Record<string, any>): Promise<string>

  // Get current provider
  getEmailProvider(): IEmailProvider

  // Get provider name
  getProviderName(): EmailProviderType

  // Render template to HTML
  renderTemplate(template: EmailTemplate, variables: Record<string, any>): string
}
```

### IEmailProvider

```typescript
interface IEmailProvider {
  // Send email
  sendEmail(to: string, subject: string, html: string, from?: string): Promise<EmailSendResult>

  // Send with template (optional)
  sendWithTemplate?(to: string, templateId: string, variables: Record<string, any>, from?: string): Promise<EmailSendResult>

  // Get provider name
  getProviderName(): string

  // Health check
  isHealthy(): Promise<boolean>
}
```

## 🤝 Contributing

When adding new email providers:

1. Implement `IEmailProvider` interface
2. Add provider type to `EmailProviderType` enum
3. Update `EmailProviderFactory.createProvider()`
4. Add environment variable validation
5. Update documentation

## 📞 Support

For issues with:
- **MailHog**: Check Docker containers and SMTP configuration
- **Resend**: Check API key and domain verification
- **BullMQ**: Check Redis connection and queue status
- **Templates**: Verify template variables match requirements
