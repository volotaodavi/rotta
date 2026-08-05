import { NotificationDeliveryController } from "../notification-delivery.controller";

import type { ChannelDeliveryJobData } from "../processors/channel-delivery-job";
import type { NotificationDeliveryRunnerService } from "../processors/notification-delivery-runner.service";

import { PermanentDeliveryError } from "@/infra/queue/qstash/permanent-delivery-error";

function buildController(runner: Partial<jest.Mocked<NotificationDeliveryRunnerService>>) {
  return new NotificationDeliveryController(runner as unknown as NotificationDeliveryRunnerService);
}

function buildJobData(overrides: Partial<ChannelDeliveryJobData> = {}): ChannelDeliveryJobData {
  return {
    notificationId: "notification-1",
    deliveryAttemptId: "attempt-1",
    canal: "PUSH",
    ...overrides,
  };
}

describe("NotificationDeliveryController", () => {
  describe("deliver", () => {
    it("responde ok em sucesso e delega para runner.run", async () => {
      const run = jest.fn().mockResolvedValue(undefined);
      const controller = buildController({ run });

      const resultado = await controller.deliver(buildJobData());

      expect(run).toHaveBeenCalledWith(buildJobData());
      expect(resultado).toEqual({ ok: true });
    });

    it("em PermanentDeliveryError, escala o fallback e responde ok (não pede retry ao QStash)", async () => {
      const run = jest.fn().mockRejectedValue(new PermanentDeliveryError("canal ainda stub"));
      const logFailure = jest.fn();
      const handlePermanentFailure = jest.fn().mockResolvedValue(undefined);
      const controller = buildController({ run, logFailure, handlePermanentFailure });

      const resultado = await controller.deliver(buildJobData());

      expect(handlePermanentFailure).toHaveBeenCalledWith(buildJobData());
      expect(resultado).toEqual({ ok: true });
    });

    it("repropaga falhas de infraestrutura (QStash tenta de novo sozinho)", async () => {
      const erro = new Error("timeout de rede");
      const run = jest.fn().mockRejectedValue(erro);
      const controller = buildController({ run });

      await expect(controller.deliver(buildJobData())).rejects.toBe(erro);
    });
  });

  describe("deliverDlq", () => {
    it("decodifica sourceBody e escala o fallback quando o QStash esgota as tentativas", async () => {
      const logFailure = jest.fn();
      const handlePermanentFailure = jest.fn().mockResolvedValue(undefined);
      const controller = buildController({ logFailure, handlePermanentFailure });
      const sourceBody = Buffer.from(JSON.stringify(buildJobData())).toString("base64");

      const resultado = await controller.deliverDlq({ sourceBody });

      expect(handlePermanentFailure).toHaveBeenCalledWith(buildJobData());
      expect(resultado).toEqual({ ok: true });
    });

    it("nunca lança quando sourceBody está ausente ou corrompido — apenas não escala", async () => {
      const handlePermanentFailure = jest.fn();
      const controller = buildController({ handlePermanentFailure });

      await expect(controller.deliverDlq({})).resolves.toEqual({ ok: true });
      expect(handlePermanentFailure).not.toHaveBeenCalled();
    });
  });
});
