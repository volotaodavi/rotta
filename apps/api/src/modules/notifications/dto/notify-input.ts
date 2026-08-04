import type {
  CommunicationChannel,
  NotificationEventType,
  NotificationPriority,
} from "@prisma/client";

/**
 * Contrato ÚNICO de entrada do Communication Engine (briefing — "Toda
 * comunicação da plataforma deverá passar exclusivamente por esse
 * módulo. Nenhum outro módulo poderá enviar notificações diretamente").
 * Não é um DTO HTTP (`class-validator`): é chamado internamente, em
 * processo, por outros módulos via `NotificationsService.notify`
 * injetado — nunca por uma rota pública.
 *
 * `titulo`/`corpo` já devem vir personalizados pelo chamador (briefing
 * "AGENTE 04 — Message Personalization AI": "Nunca utilizar mensagens
 * genéricas quando houver dados disponíveis") — só o módulo de origem
 * (Marketplace, Veículos, Escolas...) conhece os dados concretos do
 * evento (nome do aluno, horário, etc.); o Communication Engine nunca
 * resolve um template genérico por `tipo` sozinho.
 */
export interface NotifyInput {
  userId: string;
  /** Presente apenas quando o evento se origina em um contexto de tenant (ver nota em `Notification`, schema.prisma). */
  companyId?: string;
  tipo: NotificationEventType;
  titulo: string;
  corpo: string;
  dadosContexto?: Record<string, unknown>;
  /** Override raro — na ausência, `NotificationPriorityClassifierService` decide. */
  prioridade?: NotificationPriority;
  /** Override raro — na ausência, `NotificationChannelSelectorService` decide. */
  canais?: CommunicationChannel[];
}
