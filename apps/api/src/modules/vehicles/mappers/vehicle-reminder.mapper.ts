import type { VehicleReminderResponseDto } from "../dto/vehicle-reminder-response.dto";
import type { VehicleReminder } from "@prisma/client";

/** Janela de "vencendo" usada no Dashboard/lembretes (briefing "DASHBOARD" — "Documentos vencendo"). */
export const REMINDER_DUE_SOON_DAYS = 15;

/**
 * `vencido`/`vencendo` são computados aqui (nunca um job agendado só
 * para atualizar um campo `status` derivável a qualquer momento a
 * partir de `dataAlvo`) — evita que o dado fique desatualizado entre
 * execuções de um cron.
 */
export function toVehicleReminderResponseDto(
  reminder: VehicleReminder,
): VehicleReminderResponseDto {
  const now = Date.now();
  const dueSoonLimit = now + REMINDER_DUE_SOON_DAYS * 24 * 60 * 60 * 1000;
  const isPending = reminder.status === "PENDENTE";

  return {
    id: reminder.id,
    vehicleId: reminder.vehicleId,
    tipo: reminder.tipo,
    dataAlvo: reminder.dataAlvo,
    quilometragemAlvo: reminder.quilometragemAlvo,
    status: reminder.status,
    observacoes: reminder.observacoes,
    vencido: isPending && reminder.dataAlvo.getTime() < now,
    vencendo:
      isPending &&
      reminder.dataAlvo.getTime() >= now &&
      reminder.dataAlvo.getTime() <= dueSoonLimit,
    createdAt: reminder.createdAt,
  };
}
