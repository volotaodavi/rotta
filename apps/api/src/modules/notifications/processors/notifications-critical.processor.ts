import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";


import { NotificationDeliveryRunnerService } from "./notification-delivery-runner.service";

import type { ChannelDeliveryJobData } from "./channel-delivery-job";
import type { Job } from "bullmq";

import { QUEUE_NAMES } from "@/infra/queue/queue.constants";

/**
 * Worker da fila `notifications-critical` — recebe jobs de QUALQUER
 * canal (`job.data.canal`) quando a notificação é `EMERGENCIA`
 * (briefing "AGENTE 03 — Delivery AI" / prioridade máxima): uma fila
 * dedicada, isolada das filas normais por canal, garante que um pico de
 * volume em `notifications-push`/`-whatsapp`/etc. nunca atrasa uma
 * emergência. Mesma lógica de entrega de `NotificationDeliveryRunnerService`.
 */
@Processor(QUEUE_NAMES.NOTIFICATIONS_CRITICAL, { concurrency: 5 })
export class NotificationsCriticalProcessor extends WorkerHost {
  constructor(private readonly runner: NotificationDeliveryRunnerService) {
    super();
  }

  process(job: Job<ChannelDeliveryJobData>): Promise<void> {
    return this.runner.run(job.data);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<ChannelDeliveryJobData> | undefined, error: Error): void {
    this.runner.logFailure(job?.data, job?.attemptsMade ?? 0, error);
  }
}
