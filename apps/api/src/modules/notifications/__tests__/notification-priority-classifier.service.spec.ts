import { NotificationEventType, NotificationPriority } from "@prisma/client";

import { NotificationPriorityClassifierService } from "../notification-priority-classifier.service";

describe("NotificationPriorityClassifierService", () => {
  const service = new NotificationPriorityClassifierService();

  it("resolve todos os 22 NotificationEventType sem lançar", () => {
    for (const tipo of Object.values(NotificationEventType)) {
      expect(Object.values(NotificationPriority)).toContain(service.classify(tipo));
    }
  });

  it.each([
    [NotificationEventType.VIAGEM_INICIADA, NotificationPriority.INFORMATIVA],
    [NotificationEventType.ALUNO_AUSENTE, NotificationPriority.URGENTE],
    [NotificationEventType.OCORRENCIA, NotificationPriority.CRITICA],
    [NotificationEventType.EMERGENCIA, NotificationPriority.EMERGENCIA],
    [NotificationEventType.CONTRATO_ASSINADO, NotificationPriority.IMPORTANTE],
  ])("%s -> %s", (tipo, esperado) => {
    expect(service.classify(tipo)).toBe(esperado);
  });

  it("EMERGENCIA é a única prioridade EMERGENCIA (nenhum outro evento herda a exceção de Quiet Hours por engano)", () => {
    const emergencias = Object.values(NotificationEventType).filter(
      (tipo) => service.classify(tipo) === NotificationPriority.EMERGENCIA,
    );
    expect(emergencias).toEqual([NotificationEventType.EMERGENCIA]);
  });
});
