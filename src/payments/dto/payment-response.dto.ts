import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus, PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class PaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  appointmentId: string;

  @ApiProperty({ type: 'number' })
  amount: Decimal;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  paidAt?: Date;

  @ApiProperty({ required: false })
  refundedAt?: Date;

  @ApiProperty({ required: false })
  expiresAt?: Date;

  @ApiProperty({ required: false })
  processingTimeMs?: number;

  @ApiProperty({ required: false })
  retryCount: number;

  @ApiProperty({ required: false })
  failureReason?: string;

  @ApiProperty({ required: false })
  metadata?: any;

  @ApiProperty({ required: false })
  gatewayResponse?: any;

  @ApiProperty({ required: false })
  refundReason?: string;

  @ApiProperty({ required: false, type: 'number' })
  refundAmount?: Decimal;
}
