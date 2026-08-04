import type { NotificationEventType } from "@prisma/client";

/** Nome do evento (`@nestjs/event-emitter`) que qualquer módulo de domínio emite para pedir uma notificação — nunca chamam `NotificationsService` diretamente (ver `CommunicationEventsListener`). */
export const COMMUNICATION_REQUESTED_EVENT = "communication.requested";

/**
 * Payload único para os ~22 `NotificationEventType` do briefing. O
 * módulo de origem já resolve `titulo`/`corpo` via
 * `MessagePersonalizationService` ANTES de emitir — o listener nunca
 * interpreta `tipo` para montar texto (evitaria duplicar aqui a mesma
 * resolução de nomes/dados que o módulo de origem já fez).
 */
export interface CommunicationRequestedEvent {
  userId: string;
  /** Presente apenas quando o evento se origina em um contexto de tenant. */
  companyId?: string;
  tipo: NotificationEventType;
  titulo: string;
  corpo: string;
  dadosContexto?: Record<string, unknown>;
}
