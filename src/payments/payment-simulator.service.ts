import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SimulationScenario {
  result: 'success' | 'failed' | 'timeout';
  delayMs: number;
  reason?: string;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class PaymentSimulatorService {
  private readonly logger = new Logger(PaymentSimulatorService.name);
  private readonly successRate: number;
  private readonly minDelay: number;
  private readonly maxDelay: number;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.successRate = parseFloat(
      this.configService.get('PAYMENT_SIMULATION_SUCCESS_RATE', '0.85'),
    );
    this.minDelay = parseInt(
      this.configService.get('PAYMENT_SIMULATION_MIN_DELAY_MS', '1500'),
    );
    this.maxDelay = parseInt(
      this.configService.get('PAYMENT_SIMULATION_MAX_DELAY_MS', '3000'),
    );
    this.timeoutMs = parseInt(
      this.configService.get('PAYMENT_SIMULATION_TIMEOUT_MS', '30000'),
    );
  }

  /**
   * Selecciona un escenario aleatorio de simulación
   * - 85% éxito rápido (1.5-3s)
   * - 8% fallo (1-2s)
   * - 5% éxito lento (6-9s)
   * - 2% timeout (30s)
   */
  selectRandomScenario(): SimulationScenario {
    const rand = Math.random();

    if (rand < this.successRate) {
      // 85% - Pago exitoso rápido
      return {
        result: 'success',
        delayMs: this.randomBetween(this.minDelay, this.maxDelay),
      };
    } else if (rand < this.successRate + 0.08) {
      // 8% - Pago fallido
      return {
        result: 'failed',
        delayMs: this.randomBetween(1000, 2000),
        reason: this.randomFailureReason(),
        errorCode: 'DECLINE',
        errorMessage: 'Tarjeta declinada por el banco emisor',
      };
    } else if (rand < this.successRate + 0.13) {
      // 5% - Pago exitoso pero lento
      return {
        result: 'success',
        delayMs: this.randomBetween(6000, 9000),
      };
    } else {
      // 2% - Timeout
      return {
        result: 'timeout',
        delayMs: this.timeoutMs,
      };
    }
  }

  /**
   * Selecciona una razón de fallo aleatoria
   */
  randomFailureReason(): string {
    const reasons = [
      'insufficient_funds',
      'card_declined',
      'expired_card',
      'invalid_cvv',
      'fraud_suspected',
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  /**
   * Genera un número aleatorio entre min y max
   */
  randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Detecta la marca de la tarjeta basado en el número
   */
  detectCardBrand(cardNumber: string): string {
    const firstDigit = cardNumber.charAt(0);

    if (firstDigit === '4') return 'VISA';
    if (firstDigit === '5') return 'MASTERCARD';
    if (firstDigit === '3') return 'AMERICAN_EXPRESS';
    if (firstDigit === '6') return 'DISCOVER';

    return 'UNKNOWN';
  }

  /**
   * Delay asíncrono
   */
  async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Genera un código de autorización simulado
   */
  generateAuthorizationCode(): string {
    return `AUTH-${Date.now()}`;
  }

  /**
   * Calcula un score de riesgo simulado (0-1)
   */
  generateRiskScore(): number {
    // Simular score bajo (0-0.3) para la mayoría de transacciones
    return Math.random() * 0.3;
  }
}
