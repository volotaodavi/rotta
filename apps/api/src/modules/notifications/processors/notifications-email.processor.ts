import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";


import { NotificationDeliveryRunnerService } from "./notification-delivery-runner.service";

import type { ChannelDeliveryJobData } from "./channel-delivery-job";
import type { Job } from "bullmq";

import { QUEUE_NAMES } from "@/infra/queue/queue.constants";

/** Worker da fila `notifications-email` — ver `NotificationDeliveryRunnerService` para a lógica compartilhada. */
@Processor(QUEUE_NAMES.NOTIFICATIONS_EMAIL)
export class NotificationsEmailProcessor extends WorkerHost {
  constructor(private readonly runner: NotificationDeliveryRunnerService) {
    super();
  }

  process(job: Job<ChannelDeliveryJobData>): Promise<void> {
    return this.runner.run(job.data);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<ChannelDeliveryJobData> | undefined, error: Error): void {
    this.runner.logFailure(job?.data, job?.attemptsMade ?? 0, error);
    if (job && this.runner.isPermanentFailure(job, error)) {
      void this.runner.handlePermanentFailure(job.data);
    }
  }
}
