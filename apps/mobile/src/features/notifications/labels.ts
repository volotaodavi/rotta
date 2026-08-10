import {
  AlertTriangle,
  Backpack,
  Bus,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Flag,
  IdCard,
  MapPin,
  MapPinned,
  School,
  Siren,
  UserCog,
  UserRoundX,
  Users,
  XCircle,
  type LucideIcon,
} from "@rotta/icons/native";

import type { StatusPillTone } from "../vehicles/components";
import type {
  CommunicationChannel,
  NotificationEventType,
  NotificationPriorityLevel,
} from "@rotta/api-client";

/**
 * Rótulos/ícones da Central de Notificações Internas (Dossiê 11 §4.4:
 * "ícone por tipo"). Até o Dossiê 36 (Prompt 26) usava emoji simples —
 * gap documentado ali mesmo (Seção 2.2/6: "sem biblioteca de ícones
 * nativa no monorepo ainda"), fechado nesta entrega com
 * `@rotta/icons/native` (`lucide-react-native`), mesmo catálogo de
 * nomes que o Design System web.
 */
export const NOTIFICATION_TYPE_ICON: Record<NotificationEventType, LucideIcon> = {
  VIAGEM_INICIADA: Bus,
  VIAGEM_ENCERRADA: Flag,
  ALUNO_EMBARCOU: Backpack,
  ALUNO_DESEMBARCOU: School,
  ALUNO_AUSENTE: UserRoundX,
  VEICULO_PROXIMO: MapPin,
  MOTORISTA_ALTERADO: UserCog,
  MONITOR_ALTERADO: UserCog,
  VEICULO_ALTERADO: Car,
  ROTA_ALTERADA: MapPinned,
  OCORRENCIA: AlertTriangle,
  EMERGENCIA: Siren,
  NOVO_CONTRATO: FileText,
  CONTRATO_ASSINADO: CheckCircle2,
  CNH_VENCENDO: IdCard,
  DOCUMENTO_VENCENDO: FileText,
  PAGAMENTO_APROVADO: CreditCard,
  PAGAMENTO_RECUSADO: XCircle,
  PAGAMENTO_PENDENTE: Clock,
  NOVA_ESCOLA: School,
  NOVO_ALUNO: Backpack,
  NOVO_RESPONSAVEL: Users,
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
