import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados do Rotta Communication Engine (briefing "MÓDULO —
 * ROTTA COMMUNICATION ENGINE") — espelham exatamente
 * `apps/api/src/modules/notifications` (DTOs de request/response).
 * Nenhuma tela chama `apiClient.request` diretamente para uma rota de
 * Notificações — sempre por uma destas funções.
 *
 * Cobre a Central de Notificações Internas (inbox pessoal, sempre
 * escopado ao usuário autenticado — nunca recebe `userId`), dispositivos
 * (Token FCM), preferências/Quiet Hours, e o dashboard/trilha de
 * auditoria agregados POR EMPRESA (únicas funções que recebem
 * `companyId`).
 */

/**
 * Todo tipo de notificação que a API pode devolver.
 *
 * ## Esta união tem que ser IGUAL ao enum do banco, e o motivo é um
 * defeito real, não zelo
 *
 * Até 08/10/2026 ela declarava 22 valores enquanto
 * `enum NotificationEventType` no `schema.prisma` tinha 45. O arquivo
 * ainda carregava uma nota admitindo a defasagem e dizendo que ela era
 * inofensiva: "uma notificação de tipo desconhecido continua aparecendo
 * na Central, só não cai em nenhum filtro de categoria".
 *
 * Essa frase estava errada, e foi ela que fez o adiamento parecer
 * seguro. As telas de notificação resolvem o ícone de cada linha por
 * `MAPA[notification.tipo]`, e um `Record<NotificationEventType, ...>`
 * com 22 chaves satisfaz o compilador justamente porque a união tinha
 * 22 valores. Chegando um dos 23 tipos que faltavam, a busca devolve
 * `undefined`, a tela renderiza `<undefined />` e o React derruba a
 * árvore inteira com "Element type is invalid: expected a string (for
 * built-in components) or a class/function (for composite components)
 * but got: undefined". Não é um filtro que deixa de funcionar, é a
 * Central de Notificações que não abre.
 *
 * Em 07/10/2026 isso aconteceu com um usuário de verdade, duas vezes em
 * doze segundos, e os tipos que faltavam incluíam `CADASTRO_CONCLUIDO`
 * e `IDENTIDADE_APROVADA`, que são das primeiras notificações que
 * qualquer conta nova recebe.
 *
 * Por isso a união completa é o conserto de raiz: com ela, todo mapa
 * incompleto passa a ser erro de compilação, que é como este defeito
 * deveria ter sido descoberto. `notification-event-type.spec.ts`
 * tranca a união contra o `schema.prisma`, para a próxima adição ao
 * enum quebrar um teste em vez de uma tela.
 */
export type NotificationEventType =
  | "VIAGEM_INICIADA"
  | "VIAGEM_ENCERRADA"
  | "ALUNO_EMBARCOU"
  | "ALUNO_DESEMBARCOU"
  | "ALUNO_AUSENTE"
  | "VEICULO_PROXIMO"
  | "MOTORISTA_ALTERADO"
  | "MONITOR_ALTERADO"
  | "VEICULO_ALTERADO"
  | "ROTA_ALTERADA"
  | "OCORRENCIA"
  | "EMERGENCIA"
  | "NOVO_CONTRATO"
  | "CONTRATO_ASSINADO"
  | "CNH_VENCENDO"
  | "DOCUMENTO_VENCENDO"
  | "PAGAMENTO_APROVADO"
  | "PAGAMENTO_RECUSADO"
  | "PAGAMENTO_PENDENTE"
  | "NOVA_ESCOLA"
  | "NOVO_ALUNO"
  | "NOVO_RESPONSAVEL"
  // Trial de 15 dias (`TrialSchedulerService`).
  | "TRIAL_EXPIRANDO"
  | "TRIAL_VENCE_HOJE"
  | "TRIAL_BLOQUEADO"
  // Suporte (`SupportService`).
  | "SUPORTE_TICKET_ABERTO"
  | "SUPORTE_NOVA_MENSAGEM"
  | "SUPORTE_TICKET_ENCERRADO"
  // Comunicado geral do Admin Rotta (`AnnouncementsService`).
  | "AVISO_GERAL"
  // "Chegou a vez do seu filho", por transição de parada e não por GPS.
  | "ALUNO_VEZ_EMBARQUE"
  | "ALUNO_VEZ_DESEMBARQUE"
  // Revisão de veículo pelo Admin Rotta.
  | "VEICULO_REVISAO_APROVADA"
  | "VEICULO_REVISAO_REPROVADA"
  // Chat direto Responsável com Motorista/Monitor (`ConversationsService`).
  | "CONVERSA_NOVA_MENSAGEM"
  // Boas-vindas de qualquer papel, e verificação de identidade (Didit).
  | "CADASTRO_CONCLUIDO"
  | "IDENTIDADE_APROVADA"
  | "IDENTIDADE_REPROVADA"
  // Informativos internos da Rotta, só para Admin Rotta.
  | "NOVO_CLIENTE_CADASTRADO"
  | "PLANO_NOVA_ASSINATURA"
  | "RELATORIO_SEMANAL"
  | "RELATORIO_MENSAL"
  // Avisos por cargo (15/09/2026) — ver `enum NotificationEventType` no
  // `schema.prisma`, onde cada um está documentado com destinatário.
  | "NOVA_SOLICITACAO_TRANSPORTE"
  | "ALUNO_NAO_VAI_HOJE"
  | "ENDERECO_DO_DIA_ALTERADO"
  | "ESCALA_ALTERADA";

export type NotificationPriorityLevel =
  "INFORMATIVA" | "IMPORTANTE" | "URGENTE" | "CRITICA" | "EMERGENCIA";

export type CommunicationChannel = "PUSH" | "WHATSAPP" | "SMS" | "EMAIL" | "IN_APP";

export type DeviceTokenPlatform = "ANDROID" | "IOS" | "WEB";

export interface Notification {
  id: string;
  tipo: NotificationEventType;
  prioridade: NotificationPriorityLevel;
  titulo: string;
  corpo: string;
  dadosContexto: Record<string, unknown> | null;
  canaisEscolhidos: CommunicationChannel[];
  lida: boolean;
  lidaEm: string | null;
  favoritada: boolean;
  arquivada: boolean;
  createdAt: string;
}

export interface ListNotificationsParams {
  arquivada?: boolean;
  lida?: boolean;
  favoritada?: boolean;
  tipo?: NotificationEventType;
  /** Busca por título/corpo. */
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListNotificationsResult {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  plataforma: DeviceTokenPlatform;
  ativo: boolean;
  ultimoUsoEm: string;
}

export interface NotificationPreference {
  userId: string;
  receberPush: boolean;
  receberWhatsapp: boolean;
  receberSms: boolean;
  receberEmail: boolean;
  silenciarFinsDeSemana: boolean;
  /** Formato `"HH:mm"` (ex. `"22:00"`) — `null` em ambos desativa o Quiet Hours. */
  quietHoursInicio: string | null;
  quietHoursFim: string | null;
}

export type UpdateNotificationPreferenceInput = Partial<Omit<NotificationPreference, "userId">>;

export interface ChannelDeliveryStats {
  canal: CommunicationChannel;
  /** Toda tentativa de entrega (`NotificationDeliveryAttempt`), nunca notificações únicas — um retry soma outra tentativa no mesmo canal. */
  total: number;
  entregues: number;
  falharam: number;
  /** 0 a 1 — entregues/total (0 quando total é 0, nunca NaN). */
  taxaSucesso: number;
  tempoRespostaMedioMs: number | null;
}

export interface CommunicationDashboardParams {
  /** ISO 8601 — agrega apenas notificações criadas a partir desta data. */
  desde?: string;
}

export interface CommunicationDashboard {
  totalEnviadas: number;
  lidas: number;
  favoritadas: number;
  arquivadas: number;
  /** Contagem por `NotificationPriorityLevel`. */
  porPrioridade: Record<string, number>;
  /** Contagem por `NotificationEventType`. */
  porTipo: Record<string, number>;
  /** Contagem por canal ESCOLHIDO na criação, não por tentativa de entrega. */
  porCanalEscolhido: Record<string, number>;
  entregasPorCanal: ChannelDeliveryStats[];
  desde?: string;
}

export interface NotificationAuditLog {
  id: string;
  entidadeTipo: string;
  entidadeId: string;
  acao: string;
  atorUserId: string | null;
  dadosAntes: unknown;
  dadosDepois: unknown;
  createdAt: string;
}

export interface ListNotificationAuditLogsResult {
  items: NotificationAuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createNotificationsEndpoints(apiClient: ApiClient) {
  return {
    list: async (params: ListNotificationsParams = {}): Promise<ListNotificationsResult> =>
      (
        await apiClient.request<ApiEnvelope<ListNotificationsResult>>(
          `/notifications${buildQueryString(params)}`,
        )
      ).data,

    getById: async (id: string): Promise<Notification> =>
      (await apiClient.request<ApiEnvelope<Notification>>(`/notifications/${id}`)).data,

    markRead: async (id: string): Promise<Notification> =>
      (
        await apiClient.request<ApiEnvelope<Notification>>(`/notifications/${id}/lida`, {
          method: "PATCH",
        })
      ).data,

    markAllRead: async (): Promise<{ count: number }> =>
      (
        await apiClient.request<ApiEnvelope<{ count: number }>>(
          "/notifications/marcar-todas-lidas",
          { method: "POST" },
        )
      ).data,

    setFavorita: async (id: string, valor: boolean): Promise<Notification> =>
      (
        await apiClient.request<ApiEnvelope<Notification>>(`/notifications/${id}/favorita`, {
          method: "PATCH",
          body: { valor },
        })
      ).data,

    setArquivada: async (id: string, valor: boolean): Promise<Notification> =>
      (
        await apiClient.request<ApiEnvelope<Notification>>(`/notifications/${id}/arquivada`, {
          method: "PATCH",
          body: { valor },
        })
      ).data,

    remove: async (id: string): Promise<void> => {
      await apiClient.request(`/notifications/${id}`, { method: "DELETE" });
    },

    registerDeviceToken: async (
      token: string,
      plataforma: DeviceTokenPlatform,
    ): Promise<DeviceToken> =>
      (
        await apiClient.request<ApiEnvelope<DeviceToken>>("/notifications/dispositivos", {
          method: "POST",
          body: { token, plataforma },
        })
      ).data,

    deactivateDeviceToken: async (token: string): Promise<void> => {
      await apiClient.request(`/notifications/dispositivos/${token}`, { method: "DELETE" });
    },

    getPreference: async (): Promise<NotificationPreference> =>
      (await apiClient.request<ApiEnvelope<NotificationPreference>>("/notifications/preferencia"))
        .data,

    updatePreference: async (
      input: UpdateNotificationPreferenceInput,
    ): Promise<NotificationPreference> =>
      (
        await apiClient.request<ApiEnvelope<NotificationPreference>>("/notifications/preferencia", {
          method: "PATCH",
          body: input,
        })
      ).data,

    getCompanyDashboard: async (
      companyId: string,
      params: CommunicationDashboardParams = {},
    ): Promise<CommunicationDashboard> =>
      (
        await apiClient.request<ApiEnvelope<CommunicationDashboard>>(
          `/notifications/empresas/${companyId}/dashboard${buildQueryString(params)}`,
        )
      ).data,

    listCompanyAuditLogs: async (
      companyId: string,
      page = 1,
      pageSize = 20,
    ): Promise<ListNotificationAuditLogsResult> =>
      (
        await apiClient.request<ApiEnvelope<ListNotificationAuditLogsResult>>(
          `/notifications/empresas/${companyId}/audit-logs${buildQueryString({ page, pageSize })}`,
        )
      ).data,
  };
}

export type NotificationsEndpoints = ReturnType<typeof createNotificationsEndpoints>;
