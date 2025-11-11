import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { MarkCashPaidDto } from './dto/mark-cash-paid.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentHistoryQueryDto } from './dto/payment-history-query.dto';
import { PaymentHistoryItemDto } from './dto/payment-history-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { ResponseDto } from '../common/dto/response.dto';

@ApiTags('Pagos')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * HU-030: Procesar pago con tarjeta simulada
   */
  @Post(':id/process')
  @Throttle({ default: { ttl: 120000, limit: 5 } }) // 5 intentos por 2 minutos
  @Roles(Role.PATIENT)
  @ApiOperation({
    summary: 'Procesar pago con tarjeta simulada',
    description:
      'Procesa un pago pendiente con datos de tarjeta simulada. Rate limited a 5 intentos por 2 minutos.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del pago a procesar',
  })
  @ApiResponse({
    status: 200,
    description: 'Pago procesado exitosamente',
  })
  @ApiResponse({
    status: 402,
    description: 'Pago rechazado',
  })
  @ApiResponse({
    status: 408,
    description: 'Timeout en el procesamiento',
  })
  @ApiResponse({
    status: 410,
    description: 'Pago expirado',
  })
  async processPayment(
    @Param('id') paymentId: string,
    @Body() dto: ProcessPaymentDto,
    @CurrentUser() user: any,
    @Req() request: any,
  ) {
    const ipAddress = request.ip || request.connection.remoteAddress;

    const result = await this.paymentsService.processPayment(
      paymentId,
      dto,
      user.userId,
      ipAddress,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Pago procesado exitosamente',
      data: result,
    };
  }

  /**
   * HU-030: Marcar pago en efectivo como completado (ADMIN)
   */
  @Patch(':id/mark-paid-cash')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Marcar pago en efectivo como completado',
    description:
      'Permite al staff de recepción marcar un pago en efectivo como completado.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del pago en efectivo',
  })
  async markCashPaid(
    @Param('id') paymentId: string,
    @Body() dto: MarkCashPaidDto,
    @CurrentUser() user: any,
  ): Promise<ResponseDto<any>> {
    const result = await this.paymentsService.markCashPaid(
      paymentId,
      dto,
      user.userId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Pago en efectivo confirmado',
      data: result,
    };
  }

  /**
   * HU-030: Obtener historial de pagos
   */
  @Get('history')
  @Roles(Role.PATIENT)
  @ApiOperation({
    summary: 'Obtener historial de pagos',
    description: 'Lista todos los pagos realizados por el usuario autenticado.',
  })
  async getPaymentHistory(
    @Query() query: PaymentHistoryQueryDto,
    @CurrentUser() user: any,
  ): Promise<ResponseDto<PaymentHistoryItemDto[]>> {
    const result = await this.paymentsService.getPaymentHistory(
      user.userId,
      query,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Historial de pagos obtenido',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * HU-030: Solicitar reembolso
   */
  @Post(':id/refund')
  @Roles(Role.PATIENT)
  @ApiOperation({
    summary: 'Solicitar reembolso de un pago',
    description:
      'Solicita el reembolso de un pago completado si la cita fue cancelada con más de 24h de anticipación.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del pago a reembolsar',
  })
  async requestRefund(
    @Param('id') paymentId: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser() user: any,
  ): Promise<ResponseDto<any>> {
    const result = await this.paymentsService.requestRefund(
      paymentId,
      dto,
      user.userId,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Reembolso procesado exitosamente',
      data: result,
    };
  }

  /**
   * HU-030: Obtener pagos en efectivo pendientes (ADMIN)
   */
  @Get('pending-cash')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Obtener pagos en efectivo pendientes',
    description:
      'Lista todos los pagos en efectivo que están pendientes de confirmación.',
  })
  async getPendingCashPayments(): Promise<ResponseDto<any>> {
    const result = await this.paymentsService.getPendingCashPayments();

    return {
      statusCode: HttpStatus.OK,
      message: 'Pagos en efectivo pendientes obtenidos',
      data: result,
    };
  }
}
