import { CommunicationEventsListener } from "../communication-events.listener";

import type { CommunicationRequestedEvent } from "../communication-requested.event";
import type { NotificationsService } from "@/modules/notifications/notifications.service";

function buildEvent(
  overrides: Partial<CommunicationRequestedEvent> = {},
): CommunicationRequestedEvent {
  return {
    userId: "user-1",
    tipo: "NOVO_ALUNO",
    titulo: "Novo aluno",
    corpo: "Pedro foi cadastrado.",
    ...overrides,
  };
}

describe("CommunicationEventsListener", () => {
  let notificationsService: jest.Mocked<Pick<NotificationsService, "notify">>;
  let listener: CommunicationEventsListener;

  beforeEach(() => {
    notificationsService = { notify: jest.fn().mockResolvedValue({}) };
    listener = new CommunicationEventsListener(
      notificationsService as unknown as NotificationsService,
    );
  });

  it("traduz o evento em uma chamada real a NotificationsService.notify", async () => {
    const event = buildEvent();
    await listener.handle(event);
    expect(notificationsService.notify).toHaveBeenCalledWith(event);
  });

  it("nunca lança quando NotificationsService.notify falha (best-effort)", async () => {
    notificationsService.notify.mockRejectedValue(new Error("fila indisponível"));
    await expect(listener.handle(buildEvent())).resolves.toBeUndefined();
  });
});
