import type {
  CommunicationChannel,
  NotificationEventType,
  NotificationPriorityLevel,
} from "@rotta/api-client";
import type { BadgeVariant } from "@rotta/ui/web";

/**
 * Rótulos da Central de Notificações Internas (Painel Web) — mesmo
 * catálogo de `apps/mobile/src/features/notifications/labels.ts`.
 *
 * Os 19 últimos entraram em 08/10/2026: este mapa tinha 26 chaves
 * enquanto o banco já emitia 45 tipos, e uma notificação fora da lista
 * aparecia na tela com o nome do tipo em branco. Ver a nota completa
 * em `notification-icon.tsx` e a causa raiz em
 * `packages/api-client/src/endpoints/notifications.ts`.
 */
export const NOTIFICATION_TYPE_LABEL: Record<NotificationEventType, string> = {
  VIAGEM_INICIADA: "Viagem iniciada",
  VIAGEM_ENCERRADA: "Viagem encerrada",
  ALUNO_EMBARCOU: "Embarque",
  ALUNO_DESEMBARCOU: "Desembarque",
  ALUNO_AUSENTE: "Ausência",
  VEICULO_PROXIMO: "Veículo próximo",
  MOTORISTA_ALTERADO: "Motorista alterado",
  MONITOR_ALTERADO: "Monitor alterado",
  VEICULO_ALTERADO: "Veículo alterado",
  ROTA_ALTERADA: "Rota alterada",
  OCORRENCIA: "Ocorrência",
  EMERGENCIA: "Emergência",
  NOVO_CONTRATO: "Novo contrato",
  CONTRATO_ASSINADO: "Contrato assinado",
  CNH_VENCENDO: "CNH vencendo",
  DOCUMENTO_VENCENDO: "Documento vencendo",
  PAGAMENTO_APROVADO: "Pagamento aprovado",
  PAGAMENTO_RECUSADO: "Pagamento recusado",
  PAGAMENTO_PENDENTE: "Pagamento pendente",
  NOVA_ESCOLA: "Nova escola",
  NOVO_ALUNO: "Novo aluno",
  NOVO_RESPONSAVEL: "Novo responsável",
  // Avisos por cargo (15/09/2026) — mesmos rótulos do app, palavra por
  // palavra: a mesma notificação não pode ter dois nomes dependendo de
  // onde a pessoa abre.
  NOVA_SOLICITACAO_TRANSPORTE: "Nova solicitação",
  ALUNO_NAO_VAI_HOJE: "Aluno não vai hoje",
  ENDERECO_DO_DIA_ALTERADO: "Endereço de hoje",
  ESCALA_ALTERADA: "Escala alterada",
  TRIAL_EXPIRANDO: "Teste grátis acabando",
  TRIAL_VENCE_HOJE: "Teste grátis vence hoje",
  TRIAL_BLOQUEADO: "Teste grátis encerrado",
  SUPORTE_TICKET_ABERTO: "Chamado aberto",
  SUPORTE_NOVA_MENSAGEM: "Resposta do suporte",
  SUPORTE_TICKET_ENCERRADO: "Chamado encerrado",
  AVISO_GERAL: "Aviso da Rotta",
  ALUNO_VEZ_EMBARQUE: "Vez do embarque",
  ALUNO_VEZ_DESEMBARQUE: "Vez do desembarque",
  VEICULO_REVISAO_APROVADA: "Veículo aprovado",
  VEICULO_REVISAO_REPROVADA: "Veículo reprovado",
  CONVERSA_NOVA_MENSAGEM: "Nova mensagem",
  CADASTRO_CONCLUIDO: "Cadastro concluído",
  IDENTIDADE_APROVADA: "Identidade aprovada",
  IDENTIDADE_REPROVADA: "Identidade reprovada",
  NOVO_CLIENTE_CADASTRADO: "Novo cliente",
  PLANO_NOVA_ASSINATURA: "Nova assinatura",
  RELATORIO_SEMANAL: "Relatório semanal",
  RELATORIO_MENSAL: "Relatório mensal",
};

export const NOTIFICATION_PRIORITY_LABEL: Record<NotificationPriorityLevel, string> = {
  INFORMATIVA: "Informativa",
  IMPORTANTE: "Importante",
  URGENTE: "Urgente",
  CRITICA: "Crítica",
  EMERGENCIA: "Emergência",
};

export const NOTIFICATION_PRIORITY_VARIANT: Record<NotificationPriorityLevel, BadgeVariant> = {
  INFORMATIVA: "neutral",
  IMPORTANTE: "info",
  URGENTE: "warning",
  CRITICA: "danger",
  EMERGENCIA: "danger",
};

export const COMMUNICATION_CHANNEL_LABEL: Record<CommunicationChannel, string> = {
  PUSH: "Push",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  EMAIL: "E-mail",
  IN_APP: "Central de notificações",
};

/**
 * Rótulo com saída garantida, pelo mesmo motivo de `NotificationTypeIcon`:
 * o navegador pode estar servindo um pacote anterior ao último deploy da
 * API, e uma linha sem nome de tipo é pior que a palavra "Notificação".
 */
export function rotuloDoTipo(tipo: NotificationEventType): string {
  return NOTIFICATION_TYPE_LABEL[tipo] ?? "Notificação";
}
