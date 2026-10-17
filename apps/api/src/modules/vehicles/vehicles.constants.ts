/** Tokens de injeção de dependência do módulo Vehicles (Repository Pattern, Dossiê 12 Seção 6.1). */
export const VEHICLE_REPOSITORY = Symbol("VEHICLE_REPOSITORY");
export const VEHICLE_DOCUMENT_REPOSITORY = Symbol("VEHICLE_DOCUMENT_REPOSITORY");
export const VEHICLE_MAINTENANCE_REPOSITORY = Symbol("VEHICLE_MAINTENANCE_REPOSITORY");
export const VEHICLE_REMINDER_REPOSITORY = Symbol("VEHICLE_REMINDER_REPOSITORY");
export const VEHICLE_ASSIGNMENT_REPOSITORY = Symbol("VEHICLE_ASSIGNMENT_REPOSITORY");
export const VEHICLE_CHECKLIST_REPOSITORY = Symbol("VEHICLE_CHECKLIST_REPOSITORY");
export const VEHICLE_OCCURRENCE_REPOSITORY = Symbol("VEHICLE_OCCURRENCE_REPOSITORY");

/**
 * Por quanto tempo um checklist sem viagem continua sendo "o checklist
 * de agora".
 *
 * O checklist é pré-viagem: o motorista confere o veículo na garagem e
 * só depois gira a chave, então entre o checklist e o início da viagem
 * existe uma janela de verdade — minutos, ou a noite inteira quando a
 * conferência é feita na véspera do turno da manhã. Doze horas cobrem o
 * caso real e impedem o caso errado: um checklist de três semanas atrás,
 * que nunca virou viagem, não pode aparecer como o checklist da viagem
 * que vai sair agora, nem ser adotado por ela.
 */
export const JANELA_DO_CHECKLIST_PRE_VIAGEM_EM_HORAS = 12;

/** O instante a partir do qual um checklist sem viagem ainda conta — ver a constante acima. */
export function inicioDaJanelaPreViagem(agora: Date = new Date()): Date {
  return new Date(agora.getTime() - JANELA_DO_CHECKLIST_PRE_VIAGEM_EM_HORAS * 60 * 60 * 1000);
}
