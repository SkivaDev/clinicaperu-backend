import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentSimulatorService } from './payment-simulator.service';
import { PaymentProcessorService } from './payment-processor.service';
import { PaymentExpirationProcessor } from './payment-expiration.processor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot(), ConfigModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentSimulatorService,
    PaymentProcessorService,
    PaymentExpirationProcessor,
  ],
  exports: [PaymentsService, PaymentProcessorService],
})
export class PaymentsModule {}
