import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Módulo de tareas programadas (cron jobs)
 * Ejecuta trabajos periódicos para mantenimiento del sistema:
 * - Liberar slots HELD expirados cada 5 minutos
 * - Limpiar pagos stale cada hora
 * - Health check cada 30 minutos
 */
@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
