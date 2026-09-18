import { Module } from "@nestjs/common";

import { DataRetentionQueueController } from "./data-retention-queue.controller";
import { DataRetentionSchedulerService } from "./data-retention-scheduler.service";
import { DataRetentionService } from "./data-retention.service";

import { QueueModule } from "@/infra/queue/queue.module";

/**
 * Retenção de dados — hoje só o rastro bruto de GPS (`TripPosition`),
 * que é o único volume que cresce sem limite na plataforma. Ver
 * `data-retention.constants.ts` para a conta e para o que NÃO é apagado.
 */
@Module({
  imports: [QueueModule],
  controllers: [DataRetentionQueueController],
  providers: [DataRetentionService, DataRetentionSchedulerService],
  exports: [DataRetentionService],
})
export class DataRetentionModule {}
