import { Injectable } from "@nestjs/common";
import { CommunicationChannel, NotificationEventType } from "@prisma/client";

const { PUSH, WHATSAPP, SMS, EMAIL } = CommunicationChannel;

/**
 * Rotta Communication AI (briefing "ROTTA COMMUNICATION AI" — "Escolher
 * automaticamente o melhor canal para cada situação"). Implementação
 * atual: motor de regras determinístico derivado 1:1 dos exemplos do
 * briefing ("Viagem iniciada→Push", "Veículo chegando→Push+WhatsApp",
 * "CNH vencendo→Push+E-mail", "Pagamento pendente→Push+E-mail+WhatsApp")
 * — uma decisão honesta e auditável desde já (nunca aleatória/oculta),
 * não um placeholder: já resolve corretamente todo evento do módulo.
 * Evoluir para um modelo estatístico/ML (ex. taxa de leitura por canal
 * por usuário) é uma extensão FUTURA deste mesmo serviço, nunca uma
 * reescrita do `NotificationsService` que o consome — apenas o corpo de
 * `selectChannels` muda.
 *
 * `IN_APP` nunca aparece aqui: o `NotificationsService` sempre adiciona
 * o canal interno ao conjunto final, independentemente da escolha desta
 * classe — toda notificação tem um registro no histórico da Central de
 * Notificações.
 */
@Injectable()
export class NotificationChannelSelectorService {
  private static readonly CANAIS_POR_EVENTO: Readonly<
    Record<NotificationEventType, readonly CommunicationChannel[]>
  > = {
    VIAGEM_INICIADA: [PUSH],
    VIAGEM_ENCERRADA: [PUSH],
    ALUNO_EMBARCOU: [PUSH],
    ALUNO_DESEMBARCOU: [PUSH],
    ALUNO_AUSENTE: [PUSH, WHATSAPP],
    VEICULO_PROXIMO: [PUSH, WHATSAPP],
    MOTORISTA_ALTERADO: [PUSH],
    MONITOR_ALTERADO: [PUSH],
    VEICULO_ALTERADO: [PUSH],
    ROTA_ALTERADA: [PUSH],
    OCORRENCIA: [PUSH, WHATSAPP],
    EMERGENCIA: [PUSH, WHATSAPP, SMS],
    NOVO_CONTRATO: [PUSH, EMAIL],
    CONTRATO_ASSINADO: [PUSH, EMAIL],
    CNH_VENCENDO: [PUSH, EMAIL],
    DOCUMENTO_VENCENDO: [PUSH, EMAIL],
    PAGAMENTO_APROVADO: [PUSH, EMAIL],
    PAGAMENTO_RECUSADO: [PUSH, EMAIL, WHATSAPP],
    PAGAMENTO_PENDENTE: [PUSH, EMAIL, WHATSAPP],
    NOVA_ESCOLA: [PUSH],
    NOVO_ALUNO: [PUSH],
    NOVO_RESPONSAVEL: [PUSH],
    // Trial de 15 dias grátis (pedido do usuário: avisos "pela web, push
    // notifications do próprio app e email") — web é o IN_APP que
    // `NotificationsService.notify()` já adiciona sozinho a todo evento.
    TRIAL_EXPIRANDO: [PUSH, EMAIL],
    TRIAL_VENCE_HOJE: [PUSH, EMAIL],
    // Bloqueado (dia 16+) ganha WHATSAPP a mais — mesmo padrão já usado
    // pra outros avisos de cobrança (PAGAMENTO_PENDENTE/RECUSADO acima),
    // é o momento de maior urgência de ação do usuário.
    TRIAL_BLOQUEADO: [PUSH, EMAIL, WHATSAPP],
  };

  selectChannels(tipo: NotificationEventType): CommunicationChannel[] {
    return [...NotificationChannelSelectorService.CANAIS_POR_EVENTO[tipo]];
  }
}
