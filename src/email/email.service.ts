import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailTemplate, EmailStatus } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    // Validate environment variables
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
      throw new Error(
        'Missing required environment variables: SMTP_HOST, SMTP_PORT',
      );
    }

    if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
      throw new Error(
        'Missing required environment variables: REDIS_HOST, REDIS_PORT',
      );
    }

    // Configure Nodemailer transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });

    this.logger.log('✅ Email service initialized with SMTP configuration');
  }

  /**
   * Enqueue an email to be sent
   */
  async enqueueEmail(
    to: string,
    template: EmailTemplate,
    variables: Record<string, any>,
  ): Promise<string> {
    // Validate required variables for template
    this.validateTemplateVariables(template, variables);

    // Get subject for template
    const subject = this.getSubject(template);

    // Create email record in database with PENDING status
    const emailMessage = await this.prisma.emailMessage.create({
      data: {
        to,
        subject,
        template,
        variables,
        status: EmailStatus.PENDING,
      },
    });

    // Add job to BullMQ queue
    await this.emailQueue.add(
      'send',
      {
        emailId: emailMessage.id,
        to,
        template,
        variables,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    this.logger.log(
      `📧 Email enqueued: ${template} to ${to} (ID: ${emailMessage.id})`,
    );

    return emailMessage.id;
  }

  /**
   * Get the transporter for sending emails
   */
  getTransporter(): Transporter {
    return this.transporter;
  }

  /**
   * Validate that all required variables are present for a template
   */
  private validateTemplateVariables(
    template: EmailTemplate,
    variables: Record<string, any>,
  ): void {
    const requiredVars: Record<EmailTemplate, string[]> = {
      [EmailTemplate.BOOKING_CONFIRMATION]: [
        'patientName',
        'doctorName',
        'specialty',
        'date',
        'time',
        'location',
      ],
      [EmailTemplate.BOOKING_CANCELLATION]: [
        'patientName',
        'doctorName',
        'date',
        'time',
      ],
      [EmailTemplate.BOOKING_REMINDER]: [
        'patientName',
        'doctorName',
        'time',
        'location',
      ],
      [EmailTemplate.PASSWORD_RESET]: ['userName', 'resetLink'],
      [EmailTemplate.WELCOME]: ['userName'],
    };

    const required = requiredVars[template] || [];
    const missing = required.filter((key) => !variables[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required variables for template ${template}: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * Get subject line for a template
   */
  getSubject(template: EmailTemplate): string {
    const subjects: Record<EmailTemplate, string> = {
      [EmailTemplate.BOOKING_CONFIRMATION]: 'Appointment Confirmation',
      [EmailTemplate.BOOKING_CANCELLATION]: 'Appointment Cancelled',
      [EmailTemplate.BOOKING_REMINDER]: 'Appointment Reminder - Tomorrow',
      [EmailTemplate.PASSWORD_RESET]: 'Password Reset Request',
      [EmailTemplate.WELCOME]: 'Welcome to Clínica Perú',
    };

    return subjects[template] || 'Notification';
  }

  /**
   * Render HTML template with variables
   */
  renderTemplate(
    template: EmailTemplate,
    variables: Record<string, any>,
  ): string {
    switch (template) {
      case EmailTemplate.BOOKING_CONFIRMATION:
        return this.renderBookingConfirmation(variables);
      case EmailTemplate.BOOKING_CANCELLATION:
        return this.renderBookingCancellation(variables);
      case EmailTemplate.BOOKING_REMINDER:
        return this.renderBookingReminder(variables);
      case EmailTemplate.PASSWORD_RESET:
        return this.renderPasswordReset(variables);
      case EmailTemplate.WELCOME:
        return this.renderWelcome(variables);
      default:
        throw new Error(`Unknown template: ${template}`);
    }
  }

  /**
   * Template: BOOKING_CONFIRMATION
   */
  private renderBookingConfirmation(variables: Record<string, any>): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✓ Appointment Confirmed!</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${variables.patientName}</strong>,
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Your appointment has been successfully confirmed. Here are the details:
              </p>
              
              <!-- Appointment Details Table -->
              <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; margin-bottom: 30px;">
                <tr>
                  <td style="color: #666666; font-size: 14px; font-weight: bold; border-bottom: 1px solid #e0e0e0;">Doctor:</td>
                  <td style="color: #333333; font-size: 14px; border-bottom: 1px solid #e0e0e0;">${variables.doctorName}</td>
                </tr>
                <tr>
                  <td style="color: #666666; font-size: 14px; font-weight: bold; border-bottom: 1px solid #e0e0e0;">Specialty:</td>
                  <td style="color: #333333; font-size: 14px; border-bottom: 1px solid #e0e0e0;">${variables.specialty}</td>
                </tr>
                <tr>
                  <td style="color: #666666; font-size: 14px; font-weight: bold; border-bottom: 1px solid #e0e0e0;">Date:</td>
                  <td style="color: #333333; font-size: 14px; border-bottom: 1px solid #e0e0e0;">${variables.date}</td>
                </tr>
                <tr>
                  <td style="color: #666666; font-size: 14px; font-weight: bold; border-bottom: 1px solid #e0e0e0;">Time:</td>
                  <td style="color: #333333; font-size: 14px; border-bottom: 1px solid #e0e0e0;">${variables.time}</td>
                </tr>
                <tr>
                  <td style="color: #666666; font-size: 14px; font-weight: bold;">Location:</td>
                  <td style="color: #333333; font-size: 14px;">${variables.location}</td>
                </tr>
              </table>
              
              <!-- Important Note -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
                  <strong>⏰ Important:</strong> Please arrive 15 minutes early to complete any necessary paperwork.
                </p>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                If you need to cancel or reschedule, please contact us at least 24 hours in advance.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666666; font-size: 12px; margin: 0; line-height: 1.5;">
                Clínica Perú - Quality Healthcare<br>
                This is an automated message, please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Template: BOOKING_CANCELLATION
   */
  private renderBookingCancellation(variables: Record<string, any>): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Cancelled</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #dc2626; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Appointment Cancelled</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${variables.patientName}</strong>,
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Your appointment has been cancelled. Here are the details of the cancelled appointment:
              </p>
              
              <!-- Cancelled Appointment Box -->
              <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color: #666666; font-size: 14px; font-weight: bold;">Doctor:</td>
                    <td style="color: #333333; font-size: 14px;">${variables.doctorName}</td>
                  </tr>
                  <tr>
                    <td style="color: #666666; font-size: 14px; font-weight: bold;">Date:</td>
                    <td style="color: #333333; font-size: 14px;">${variables.date}</td>
                  </tr>
                  <tr>
                    <td style="color: #666666; font-size: 14px; font-weight: bold;">Time:</td>
                    <td style="color: #333333; font-size: 14px;">${variables.time}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Warning -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
                  <strong>⚠️ Important:</strong> If you didn't request this cancellation, please contact us immediately.
                </p>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                You can schedule a new appointment at any time through our platform or by contacting us directly.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666666; font-size: 12px; margin: 0; line-height: 1.5;">
                Clínica Perú - Quality Healthcare<br>
                This is an automated message, please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Template: BOOKING_REMINDER
   */
  private renderBookingReminder(variables: Record<string, any>): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📅 Appointment Reminder</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${variables.patientName}</strong>,
              </p>
              
              <p style="color: #333333; font-size: 18px; line-height: 1.6; margin: 0 0 30px 0; font-weight: bold;">
                This is a friendly reminder that you have an appointment <span style="color: #2563eb;">tomorrow</span>.
              </p>
              
              <!-- Reminder Box -->
              <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color: #666666; font-size: 14px; font-weight: bold;">Doctor:</td>
                    <td style="color: #333333; font-size: 14px;">${variables.doctorName}</td>
                  </tr>
                  <tr>
                    <td style="color: #666666; font-size: 14px; font-weight: bold;">Time:</td>
                    <td style="color: #333333; font-size: 14px;">${variables.time}</td>
                  </tr>
                  <tr>
                    <td style="color: #666666; font-size: 14px; font-weight: bold;">Location:</td>
                    <td style="color: #333333; font-size: 14px;">${variables.location}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                Please remember to arrive 15 minutes early.
              </p>
              
              <p style="color: #2563eb; font-size: 16px; line-height: 1.6; margin: 0; font-weight: bold;">
                See you tomorrow! 👋
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666666; font-size: 12px; margin: 0; line-height: 1.5;">
                Clínica Perú - Quality Healthcare<br>
                This is an automated message, please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Template: PASSWORD_RESET
   */
  private renderPasswordReset(variables: Record<string, any>): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #2563eb; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Password Reset Request</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${variables.userName}</strong>,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                We received a request to reset your password. Click the button below to proceed:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${variables.resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reset Password</a>
              </div>
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                If you didn't request this, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666666; font-size: 12px; margin: 0; line-height: 1.5;">
                Clínica Perú - Quality Healthcare<br>
                This is an automated message, please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Template: WELCOME
   */
  private renderWelcome(variables: Record<string, any>): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #2563eb; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to Clínica Perú! 🎉</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${variables.userName}</strong>,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Thank you for joining Clínica Perú. We're excited to have you with us!
              </p>
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                You can now schedule appointments with our specialists and manage your healthcare online.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666666; font-size: 12px; margin: 0; line-height: 1.5;">
                Clínica Perú - Quality Healthcare<br>
                This is an automated message, please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
