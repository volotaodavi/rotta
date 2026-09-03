import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Avisos/Comunicados — espelham
 * `apps/api/src/modules/announcements`, mesmo padrão de `endpoints/support.ts`.
 */

export type AnnouncementAudience = "TODOS" | "EMPRESAS" | "MOTORISTAS_MONITORES" | "RESPONSAVEIS";

export const ANNOUNCEMENT_AUDIENCE_LABEL: Record<AnnouncementAudience, string> = {
  TODOS: "Todos",
  EMPRESAS: "Empresas/Gestores",
  MOTORISTAS_MONITORES: "Motoristas/Monitores",
  RESPONSAVEIS: "Responsáveis",
};

export interface Announcement {
  id: string;
  titulo: string;
  corpo: string;
  publico: AnnouncementAudience;
  criadoPorUserId: string;
  criadoPorNome: string;
  destinatariosCount: number;
  createdAt: string;
}

export interface CreateAnnouncementInput {
  titulo: string;
  corpo: string;
  publico: AnnouncementAudience;
}

export interface ListAnnouncementsParams {
  page?: number;
  pageSize?: number;
}

export interface ListAnnouncementsResponse {
  items: Announcement[];
  total: number;
  page: number;
  pageSize: number;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createAnnouncementsEndpoints(apiClient: ApiClient) {
  return {
    create: async (input: CreateAnnouncementInput): Promise<Announcement> =>
      (
        await apiClient.request<ApiEnvelope<Announcement>>("/announcements", {
          method: "POST",
          body: input,
        })
      ).data,

    list: async (params: ListAnnouncementsParams = {}): Promise<ListAnnouncementsResponse> =>
      (
        await apiClient.request<ApiEnvelope<ListAnnouncementsResponse>>(
          `/announcements${buildQueryString(params)}`,
        )
      ).data,
  };
}

export type AnnouncementsEndpoints = ReturnType<typeof createAnnouncementsEndpoints>;
