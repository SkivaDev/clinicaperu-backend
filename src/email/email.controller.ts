import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SendTestEmailDto } from './dto/send-test-email.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('email-test')
@Controller('email-test')
export class EmailController {
  constructor(
    private emailService: EmailService,
    private prisma: PrismaService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a test email' })
  @ApiResponse({
    status: 200,
    description: 'Email enqueued successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  async sendTestEmail(@Body() dto: SendTestEmailDto) {
    const emailId = await this.emailService.enqueueEmail(
      dto.to,
      dto.template,
      dto.variables,
    );

    return {
      message: 'Email enqueued',
      emailId,
      checkStatus: `/email-test/status/${emailId}`,
      viewInMailhog: 'http://localhost:8025',
    };
  }

  @Get('status/:id')
  @ApiOperation({ summary: 'Get email status by ID' })
  @ApiResponse({
    status: 200,
    description: 'Email status retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Email not found',
  })
  async getEmailStatus(@Param('id') id: string) {
    const email = await this.prisma.emailMessage.findUnique({
      where: { id },
    });

    if (!email) {
      throw new NotFoundException(`Email with ID ${id} not found`);
    }

    return {
      id: email.id,
      to: email.to,
      status: email.status,
      attempts: email.attempts,
      sentAt: email.sentAt,
      lastError: email.lastError,
      template: email.template,
      createdAt: email.createdAt,
      updatedAt: email.updatedAt,
    };
  }
}
