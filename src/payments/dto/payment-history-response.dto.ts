import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';
import { ResponseDto } from '../../common/dto/response.dto';

export class PaymentHistoryDoctorSpecialtyDto {
  @ApiProperty()
  name: string;
}

export class PaymentHistoryDoctorDto {
  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ type: () => PaymentHistoryDoctorSpecialtyDto })
  specialty: PaymentHistoryDoctorSpecialtyDto;
}

export class PaymentHistoryAppointmentSlotDto {
  @ApiProperty({ type: String, format: 'date-time' })
  startAt: Date;
}

export class PaymentHistoryAppointmentDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: () => PaymentHistoryAppointmentSlotDto })
  slot: PaymentHistoryAppointmentSlotDto;

  @ApiProperty({ type: () => PaymentHistoryDoctorDto })
  doctor: PaymentHistoryDoctorDto;
}

export class PaymentHistoryItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  transactionId: string;

  @ApiProperty({ type: 'number' })
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @ApiProperty({
    required: false,
    type: String,
    format: 'date-time',
    nullable: true,
  })
  paidAt?: Date | null;

  @ApiProperty({ type: () => PaymentHistoryAppointmentDto })
  appointment: PaymentHistoryAppointmentDto;

  @ApiProperty({
    required: false,
    type: Object,
    nullable: true,
  })
  metadata?: JsonValue | null;
}

export class PaymentHistoryMetaDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPrevPage: boolean;
}

export class PaymentHistoryResponseDto extends ResponseDto<
  PaymentHistoryItemDto[]
> {
  @ApiProperty({ example: 200 })
  declare statusCode: number;

  @ApiProperty({ example: 'Historial de pagos obtenido' })
  declare message: string;

  @ApiProperty({ type: () => [PaymentHistoryItemDto] })
  declare data: PaymentHistoryItemDto[];

  @ApiProperty({ required: false, type: () => PaymentHistoryMetaDto })
  declare meta?: PaymentHistoryMetaDto;
}
