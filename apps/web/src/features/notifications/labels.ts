import type {
  CommunicationChannel,
  NotificationEventType,
  NotificationPriorityLevel,
} from "@rotta/api-client";
import type { BadgeVariant } from "@rotta/ui/web";

/** Rótulos da Central de Notificações Internas (Painel Web) — mesmo catálogo de `apps/mobile/src/features/notifications/labels.ts`. */
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
