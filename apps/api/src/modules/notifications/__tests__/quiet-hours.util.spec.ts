import { NotificationPriority } from "@prisma/client";

import { isQuietHoursActive } from "../quiet-hours.util";

function dateAt(hour: number, minute: number, weekday: number): Date {
  // 2024-01-07 é um domingo (weekday 0); soma dias para alcançar o weekday desejado.
  const date = new Date(2024, 0, 7 + weekday, hour, minute, 0);
  return date;
}

describe("isQuietHoursActive", () => {
  const config = {
    silenciarFinsDeSemana: false,
    quietHoursInicio: "22:00",
    quietHoursFim: "06:00",
  };

  it("EMERGENCIA nunca é silenciada, mesmo dentro da janela/fim de semana", () => {
    const dentroDaJanelaNoDomingo = dateAt(23, 0, 0);
    expect(
      isQuietHoursActive(
        { ...config, silenciarFinsDeSemana: true },
        NotificationPriority.EMERGENCIA,
        dentroDaJanelaNoDomingo,
      ),
    ).toBe(false);
  });

  it("silencia o dia todo em fins de semana quando silenciarFinsDeSemana=true", () => {
    const sabadoDeManha = dateAt(10, 0, 6);
    const domingoDeNoite = dateAt(23, 0, 0);
    expect(
      isQuietHoursActive(
        { ...config, silenciarFinsDeSemana: true },
        NotificationPriority.INFORMATIVA,
        sabadoDeManha,
      ),
    ).toBe(true);
    expect(
      isQuietHoursActive(
        { ...config, silenciarFinsDeSemana: true },
        NotificationPriority.INFORMATIVA,
        domingoDeNoite,
      ),
    ).toBe(true);
  });

  it("não silencia fim de semana quando a flag está desligada", () => {
    const sabadoDeManha = dateAt(10, 0, 6);
    expect(isQuietHoursActive(config, NotificationPriority.INFORMATIVA, sabadoDeManha)).toBe(false);
  });

  describe("janela que cruza a meia-noite (22:00 -> 06:00)", () => {
    it("silencia às 23:00 (depois do início)", () => {
      const terca = dateAt(23, 0, 2);
      expect(isQuietHoursActive(config, NotificationPriority.INFORMATIVA, terca)).toBe(true);
    });

    it("silencia às 03:00 (antes do fim, já passou da meia-noite)", () => {
      const terca = dateAt(3, 0, 2);
      expect(isQuietHoursActive(config, NotificationPriority.INFORMATIVA, terca)).toBe(true);
    });

    it("não silencia às 12:00 (fora da janela)", () => {
      const terca = dateAt(12, 0, 2);
      expect(isQuietHoursActive(config, NotificationPriority.INFORMATIVA, terca)).toBe(false);
    });

    it("não silencia exatamente no limite de fim (06:00)", () => {
      const terca = dateAt(6, 0, 2);
      expect(isQuietHoursActive(config, NotificationPriority.INFORMATIVA, terca)).toBe(false);
    });

    it("silencia exatamente no limite de início (22:00)", () => {
      const terca = dateAt(22, 0, 2);
      expect(isQuietHoursActive(config, NotificationPriority.INFORMATIVA, terca)).toBe(true);
    });
  });

  describe("janela simples (não cruza a meia-noite)", () => {
    const janelaSimples = {
      silenciarFinsDeSemana: false,
      quietHoursInicio: "12:00",
      quietHoursFim: "14:00",
    };

    it("silencia dentro do intervalo", () => {
      const terca = dateAt(13, 0, 2);
      expect(isQuietHoursActive(janelaSimples, NotificationPriority.INFORMATIVA, terca)).toBe(true);
    });

    it("não silencia fora do intervalo", () => {
      const terca = dateAt(15, 0, 2);
      expect(isQuietHoursActive(janelaSimples, NotificationPriority.INFORMATIVA, terca)).toBe(
        false,
      );
    });
  });

  it("nunca silencia quando início/fim são iguais (janela degenerada)", () => {
    const janelaDegenerada = {
      silenciarFinsDeSemana: false,
      quietHoursInicio: "08:00",
      quietHoursFim: "08:00",
    };
    const terca = dateAt(8, 0, 2);
    expect(isQuietHoursActive(janelaDegenerada, NotificationPriority.INFORMATIVA, terca)).toBe(
      false,
    );
  });

  it.each([
    [{ silenciarFinsDeSemana: false, quietHoursInicio: null, quietHoursFim: null }],
    [{ silenciarFinsDeSemana: false, quietHoursInicio: "22:00", quietHoursFim: null }],
    [{ silenciarFinsDeSemana: false, quietHoursInicio: null, quietHoursFim: "06:00" }],
    [{ silenciarFinsDeSemana: false, quietHoursInicio: "25:00", quietHoursFim: "06:00" }],
    [{ silenciarFinsDeSemana: false, quietHoursInicio: "22:00", quietHoursFim: "06:60" }],
  ])("nunca silencia sem configuração válida: %j", (config) => {
    const terca = dateAt(23, 0, 2);
    expect(isQuietHoursActive(config, NotificationPriority.INFORMATIVA, terca)).toBe(false);
  });
});
