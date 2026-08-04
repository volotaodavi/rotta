import { toNotificationResponseDto } from "../mappers/notification.mapper";

import type { Notification } from "@prisma/client";

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notification-1",
    userId: "user-1",
    companyId: "company-1",
    tipo: "NOVO_ALUNO",
    prioridade: "INFORMATIVA",
    titulo: "Novo aluno",
    corpo: "Pedro foi cadastrado.",
    dadosContexto: { studentId: "student-1" },
    canaisEscolhidos: ["IN_APP", "PUSH"],
    lida: false,
    lidaEm: null,
    favoritada: false,
    arquivada: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("toNotificationResponseDto", () => {
  it("nunca vaza userId/companyId — o dono já é implícito na sessão", () => {
    const dto = toNotificationResponseDto(buildNotification());
    expect(dto).not.toHaveProperty("userId");
    expect(dto).not.toHaveProperty("companyId");
  });

  it("mapeia todos os campos públicos", () => {
    const notification = buildNotification();
    const dto = toNotificationResponseDto(notification);

    expect(dto).toEqual({
      id: "notification-1",
      tipo: "NOVO_ALUNO",
      prioridade: "INFORMATIVA",
      titulo: "Novo aluno",
      corpo: "Pedro foi cadastrado.",
      dadosContexto: { studentId: "student-1" },
      canaisEscolhidos: ["IN_APP", "PUSH"],
      lida: false,
      lidaEm: null,
      favoritada: false,
      arquivada: false,
      createdAt: notification.createdAt,
    });
  });

  it("dadosContexto ausente vira null (nunca undefined)", () => {
    const dto = toNotificationResponseDto(buildNotification({ dadosContexto: null }));
    expect(dto.dadosContexto).toBeNull();
  });
});
