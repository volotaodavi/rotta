import { CommunicationChannel, NotificationEventType } from "@prisma/client";

import { NotificationChannelSelectorService } from "../notification-channel-selector.service";

describe("NotificationChannelSelectorService", () => {
  const service = new NotificationChannelSelectorService();

  it("nunca inclui IN_APP — o NotificationsService sempre adiciona por conta própria", () => {
    for (const tipo of Object.values(NotificationEventType)) {
      expect(service.selectChannels(tipo)).not.toContain(CommunicationChannel.IN_APP);
    }
  });

  it("resolve todos os 22 NotificationEventType sem lançar (motor de regras nunca incompleto)", () => {
    for (const tipo of Object.values(NotificationEventType)) {
      expect(service.selectChannels(tipo).length).toBeGreaterThan(0);
    }
  });

  it.each([
    [NotificationEventType.VIAGEM_INICIADA, [CommunicationChannel.PUSH]],
    [
      NotificationEventType.EMERGENCIA,
      [CommunicationChannel.PUSH, CommunicationChannel.WHATSAPP, CommunicationChannel.SMS],
    ],
    [NotificationEventType.NOVO_CONTRATO, [CommunicationChannel.PUSH, CommunicationChannel.EMAIL]],
    [
      NotificationEventType.PAGAMENTO_PENDENTE,
      [CommunicationChannel.PUSH, CommunicationChannel.EMAIL, CommunicationChannel.WHATSAPP],
    ],
  ])("%s -> %j (exemplos literais do briefing)", (tipo, esperado) => {
    expect(service.selectChannels(tipo)).toEqual(esperado);
  });

  it("retorna uma cópia nova a cada chamada (mutar o resultado não corrompe o motor de regras)", () => {
    const primeira = service.selectChannels(NotificationEventType.VIAGEM_INICIADA);
    primeira.push(CommunicationChannel.SMS);
    const segunda = service.selectChannels(NotificationEventType.VIAGEM_INICIADA);
    expect(segunda).toEqual([CommunicationChannel.PUSH]);
  });
});
