import { NotificationsCriticalProcessor } from "../processors/notifications-critical.processor";
import { NotificationsEmailProcessor } from "../processors/notifications-email.processor";
import { NotificationsPushProcessor } from "../processors/notifications-push.processor";
import { NotificationsSmsProcessor } from "../processors/notifications-sms.processor";
import { NotificationsWhatsappProcessor } from "../processors/notifications-whatsapp.processor";

import type { ChannelDeliveryJobData } from "../processors/channel-delivery-job";
import type { NotificationDeliveryRunnerService } from "../processors/notification-delivery-runner.service";
import type { Job } from "bullmq";

function buildRunner(): jest.Mocked<
  Pick<
    NotificationDeliveryRunnerService,
    "run" | "logFailure" | "isPermanentFailure" | "handlePermanentFailure"
  >
> {
  return {
    run: jest.fn().mockResolvedValue(undefined),
    logFailure: jest.fn(),
    isPermanentFailure: jest.fn().mockReturnValue(false),
    handlePermanentFailure: jest.fn().mockResolvedValue(undefined),
  };
}

function buildJob(): Job<ChannelDeliveryJobData> {
  return {
    data: { notificationId: "notification-1", deliveryAttemptId: "attempt-1", canal: "PUSH" },
    attemptsMade: 1,
  } as Job<ChannelDeliveryJobData>;
}

describe.each([
  ["NotificationsPushProcessor", NotificationsPushProcessor, true],
  ["NotificationsWhatsappProcessor", NotificationsWhatsappProcessor, true],
  ["NotificationsSmsProcessor", NotificationsSmsProcessor, true],
  ["NotificationsEmailProcessor", NotificationsEmailProcessor, true],
  ["NotificationsCriticalProcessor", NotificationsCriticalProcessor, false],
])("%s", (_name, ProcessorClass, escalaEmFalhaPermanente) => {
  it("process delega para runner.run", async () => {
    const runner = buildRunner();
    const processor = new ProcessorClass(runner as unknown as NotificationDeliveryRunnerService);
    const job = buildJob();

    await processor.process(job);

    expect(runner.run).toHaveBeenCalledWith(job.data);
  });

  it("onFailed sempre loga a falha", () => {
    const runner = buildRunner();
    const processor = new ProcessorClass(runner as unknown as NotificationDeliveryRunnerService);
    const job = buildJob();
    const erro = new Error("falhou");

    processor.onFailed(job, erro);

    expect(runner.logFailure).toHaveBeenCalledWith(job.data, 1, erro);
  });

  it("onFailed nunca lança mesmo com job undefined", () => {
    const runner = buildRunner();
    const processor = new ProcessorClass(runner as unknown as NotificationDeliveryRunnerService);
    expect(() => processor.onFailed(undefined, new Error("falhou"))).not.toThrow();
    expect(runner.logFailure).toHaveBeenCalledWith(undefined, 0, expect.any(Error));
  });

  if (escalaEmFalhaPermanente) {
    it("onFailed escala para o fallback quando a falha é permanente", () => {
      const runner = buildRunner();
      runner.isPermanentFailure.mockReturnValue(true);
      const processor = new ProcessorClass(runner as unknown as NotificationDeliveryRunnerService);
      const job = buildJob();

      processor.onFailed(job, new Error("falhou"));

      expect(runner.handlePermanentFailure).toHaveBeenCalledWith(job.data);
    });

    it("onFailed não escala quando a falha ainda pode ter retry", () => {
      const runner = buildRunner();
      runner.isPermanentFailure.mockReturnValue(false);
      const processor = new ProcessorClass(runner as unknown as NotificationDeliveryRunnerService);
      const job = buildJob();

      processor.onFailed(job, new Error("falhou"));

      expect(runner.handlePermanentFailure).not.toHaveBeenCalled();
    });
  } else {
    it("onFailed nunca escala (a fila crítica já é o topo da cadeia)", () => {
      const runner = buildRunner();
      const processor = new ProcessorClass(runner as unknown as NotificationDeliveryRunnerService);
      const job = buildJob();

      processor.onFailed(job, new Error("falhou"));

      expect(runner.handlePermanentFailure).not.toHaveBeenCalled();
    });
  }
});
