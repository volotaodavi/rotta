import { NotificationPriority } from "@prisma/client";

export interface QuietHoursConfig {
  silenciarFinsDeSemana: boolean;
  quietHoursInicio: string | null;
  quietHoursFim: string | null;
}

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function minutosDesde(horaHHmm: string): number {
  return Number(horaHHmm.slice(0, 2)) * 60 + Number(horaHHmm.slice(3, 5));
}

/**
 * Horário silencioso (briefing "QUIET HOURS" — "ex. 22:00 até 06:00...
 * Exceto notificações críticas"). `EMERGENCIA` NUNCA é silenciado,
 * mesmo com Quiet Hours/fim de semana configurados — nenhum chamador
 * deste util precisa lembrar dessa exceção, ela já está embutida aqui.
 * Suporta janela que cruza a meia-noite (22:00→06:00): quando
 * `inicio > fim`, a janela silenciosa é "depois de inicio OU antes de
 * fim", em vez do intervalo simples `[inicio, fim]`.
 */
export function isQuietHoursActive(
  config: QuietHoursConfig,
  priority: NotificationPriority,
  now: Date = new Date(),
): boolean {
  if (priority === NotificationPriority.EMERGENCIA) return false;

  const diaDaSemana = now.getDay();
  const isFimDeSemana = diaDaSemana === 0 || diaDaSemana === 6;
  if (config.silenciarFinsDeSemana && isFimDeSemana) return true;

  if (
    !config.quietHoursInicio ||
    !config.quietHoursFim ||
    !HORA_REGEX.test(config.quietHoursInicio) ||
    !HORA_REGEX.test(config.quietHoursFim)
  ) {
    return false;
  }

  const inicioMin = minutosDesde(config.quietHoursInicio);
  const fimMin = minutosDesde(config.quietHoursFim);
  const agoraMin = now.getHours() * 60 + now.getMinutes();

  if (inicioMin === fimMin) return false;

  return inicioMin < fimMin
    ? agoraMin >= inicioMin && agoraMin < fimMin
    : agoraMin >= inicioMin || agoraMin < fimMin;
}
