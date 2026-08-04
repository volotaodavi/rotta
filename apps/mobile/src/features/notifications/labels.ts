import type { StatusPillTone } from "../vehicles/components";
import type {
  CommunicationChannel,
  NotificationEventType,
  NotificationPriorityLevel,
} from "@rotta/api-client";

/**
 * Rótulos/ícones da Central de Notificações Internas (Dossiê 11 §4.4:
 * "ícone por tipo") — sem biblioteca de ícones nativa no monorepo ainda
 * (Dossiê 22/23), por isso emoji simples, mesma decisão de escopo já
 * registrada em `features/vehicles/components/vehicle-screen.tsx`.
 */
export const NOTIFICATION_TYPE_ICON: Record<NotificationEventType, string> = {
  VIAGEM_INICIADA: "🚌",
  VIAGEM_ENCERRADA: "🏁",
  ALUNO_EMBARCOU: "🧒",
  ALUNO_DESEMBARCOU: "🏫",
  ALUNO_AUSENTE: "🚫",
  VEICULO_PROXIMO: "📍",
  MOTORISTA_ALTERADO: "🧑‍✈️",
  MONITOR_ALTERADO: "🧑‍🏫",
  VEICULO_ALTERADO: "🚐",
  ROTA_ALTERADA: "🗺️",
  OCORRENCIA: "⚠️",
  EMERGENCIA: "🚨",
  NOVO_CONTRATO: "📄",
  CONTRATO_ASSINADO: "✅",
  CNH_VENCENDO: "🪪",
  DOCUMENTO_VENCENDO: "📑",
  PAGAMENTO_APROVADO: "💳",
  PAGAMENTO_RECUSADO: "❌",
  PAGAMENTO_PENDENTE: "⏳",
  NOVA_ESCOLA: "🏫",
  NOVO_ALUNO: "🎒",
  NOVO_RESPONSAVEL: "👪",
};

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

export const NOTIFICATION_PRIORITY_TONE: Record<NotificationPriorityLevel, StatusPillTone> = {
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
