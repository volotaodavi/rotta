import { Injectable } from "@nestjs/common";
import { NotificationEventType, NotificationPriority } from "@prisma/client";

const { INFORMATIVA, IMPORTANTE, URGENTE, CRITICA, EMERGENCIA } = NotificationPriority;

/**
 * Notification Priority AI (briefing "AGENTE 02" — "Classificar
 * notificações em níveis: Informativa, Importante, Urgente, Crítica,
 * Emergência"). Mesma natureza do `NotificationChannelSelectorService`:
 * motor de regras determinístico hoje, ponto de extensão para um
 * classificador estatístico/ML no futuro sem alterar quem o consome.
 */
@Injectable()
export class NotificationPriorityClassifierService {
  private static readonly PRIORIDADE_POR_EVENTO: Readonly<
    Record<NotificationEventType, NotificationPriority>
  > = {
    VIAGEM_INICIADA: INFORMATIVA,
    VIAGEM_ENCERRADA: INFORMATIVA,
    ALUNO_EMBARCOU: INFORMATIVA,
    ALUNO_DESEMBARCOU: INFORMATIVA,
    ALUNO_AUSENTE: URGENTE,
    VEICULO_PROXIMO: IMPORTANTE,
    MOTORISTA_ALTERADO: INFORMATIVA,
    MONITOR_ALTERADO: INFORMATIVA,
    VEICULO_ALTERADO: INFORMATIVA,
    ROTA_ALTERADA: INFORMATIVA,
    OCORRENCIA: CRITICA,
    EMERGENCIA: EMERGENCIA,
    NOVO_CONTRATO: INFORMATIVA,
    CONTRATO_ASSINADO: IMPORTANTE,
    CNH_VENCENDO: URGENTE,
    DOCUMENTO_VENCENDO: IMPORTANTE,
    PAGAMENTO_APROVADO: IMPORTANTE,
    PAGAMENTO_RECUSADO: URGENTE,
    PAGAMENTO_PENDENTE: URGENTE,
    NOVA_ESCOLA: INFORMATIVA,
    NOVO_ALUNO: INFORMATIVA,
    NOVO_RESPONSAVEL: INFORMATIVA,
    // Nenhum dos três é EMERGENCIA (só bypassa Quiet Hours) — é um
    // aviso de cobrança, não um incidente de segurança; mesmo de
    // madrugada o Quiet Hours deve valer, entregue quando reabrir.
    TRIAL_EXPIRANDO: IMPORTANTE,
    TRIAL_VENCE_HOJE: URGENTE,
    TRIAL_BLOQUEADO: CRITICA,
  };

  classify(tipo: NotificationEventType): NotificationPriority {
    return NotificationPriorityClassifierService.PRIORIDADE_POR_EVENTO[tipo];
  }
}
