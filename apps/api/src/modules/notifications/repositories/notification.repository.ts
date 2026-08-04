import type {
  CommunicationChannel,
  Notification,
  NotificationEventType,
  NotificationPriority,
} from "@prisma/client";

export interface CreateNotificationData {
  userId: string;
  companyId?: string;
  tipo: NotificationEventType;
  prioridade: NotificationPriority;
  titulo: string;
  corpo: string;
  dadosContexto?: Record<string, unknown>;
  canaisEscolhidos: CommunicationChannel[];
}

export interface ListNotificationsFilter {
  userId: string;
  arquivada?: boolean;
  lida?: boolean;
  favoritada?: boolean;
  tipo?: NotificationEventType;
  search?: string;
  page: number;
  pageSize: number;
}

export interface ListNotificationsResult {
  items: Notification[];
  total: number;
}

/**
 * `notifications` TEM RLS por `companyId` (ver nota do model, schema.
 * prisma) — mas o acesso ao PRÓPRIO inbox, por QUALQUER usuário, é
 * SEMPRE via bypass explícito filtrado por `userId` (nunca uma policy de
 * RLS por `userId`). Por isso nenhum método aqui recebe `companyId`
 * como filtro de acesso; a única leitura tenant-scoped real é
 * `countByCompany` (dashboard de comunicação, briefing "CENTRAL DE
 * COMUNICAÇÃO"), que passa pelo `withTenant` normal.
 */
export interface NotificationRepository {
  create(data: CreateNotificationData): Promise<Notification>;
  findByIdForUser(id: string, userId: string): Promise<Notification | null>;
  /**
   * Leitura interna SEM checagem de dono — usada apenas pelos processors
   * de entrega (o `notificationId` do job já é um dado interno confiável,
   * nunca um parâmetro de cliente), nunca por um controller.
   */
  findByIdInternal(id: string): Promise<Notification | null>;
  /**
   * Acrescenta um canal a `canaisEscolhidos` (briefing "AGENTE 03 —
   * Delivery AI": "Caso falhe: ... Trocar canal") — usado apenas quando
   * o Delivery AI decide escalar para um canal de fallback após falha
   * permanente do canal original; nunca chamado na criação (que já
   * grava a lista completa via `create`).
   */
  addChannel(id: string, canal: CommunicationChannel): Promise<Notification>;
  list(filter: ListNotificationsFilter): Promise<ListNotificationsResult>;
  markRead(id: string, userId: string): Promise<Notification>;
  markAllRead(userId: string): Promise<number>;
  setFavorita(id: string, userId: string, favoritada: boolean): Promise<Notification>;
  setArquivada(id: string, userId: string, arquivada: boolean): Promise<Notification>;
  delete(id: string, userId: string): Promise<void>;
  /** Consulta agregada do dashboard de comunicação de UMA empresa — via `withTenant`. */
  countByCompany(
    companyId: string,
    filter: { desde?: Date },
  ): Promise<{ total: number; lidas: number; favoritadas: number; arquivadas: number }>;
  /** Quebra por `NotificationPriority` (briefing "AGENTE 02") do dashboard de comunicação — via `withTenant`. */
  countByPriority(
    companyId: string,
    filter: { desde?: Date },
  ): Promise<{ prioridade: NotificationPriority; total: number }[]>;
  /** Quebra por `NotificationEventType` do dashboard de comunicação — via `withTenant`. */
  countByType(
    companyId: string,
    filter: { desde?: Date },
  ): Promise<{ tipo: NotificationEventType; total: number }[]>;
  /**
   * Quebra por canal ESCOLHIDO (`canaisEscolhidos`, array — nunca o canal
   * de UMA tentativa de entrega, ver `NotificationDeliveryAttemptRepository.
   * statsByCompany` para isso) do dashboard de comunicação. Prisma não
   * agrupa por elemento de array nativamente, então soma em memória sobre
   * a lista já filtrada por `companyId`/período — aceitável para uma
   * consulta agregada de dashboard (nunca no caminho de escrita/entrega).
   */
  countByChannel(
    companyId: string,
    filter: { desde?: Date },
  ): Promise<{ canal: CommunicationChannel; total: number }[]>;
}
