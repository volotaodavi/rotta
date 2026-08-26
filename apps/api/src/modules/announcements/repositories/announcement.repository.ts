import type { AnnouncementAudience, Prisma } from "@prisma/client";

/** `include` compartilhado — nome de quem publicou, sem exigir uma segunda consulta. */
export const ANNOUNCEMENT_INCLUDE = {
  criadoPor: { select: { id: true, nome: true } },
} satisfies Prisma.AnnouncementInclude;

export type AnnouncementWithAutor = Prisma.AnnouncementGetPayload<{
  include: typeof ANNOUNCEMENT_INCLUDE;
}>;

export interface CreateAnnouncementData {
  titulo: string;
  corpo: string;
  publico: AnnouncementAudience;
  criadoPorUserId: string;
  destinatariosCount: number;
}

export interface ListAnnouncementsFilter {
  page: number;
  pageSize: number;
}

export interface ListAnnouncementsResult {
  items: AnnouncementWithAutor[];
  total: number;
}

/**
 * `announcements` é tabela global (sem tenant/RLS, Dossiê 8 Secao 2 —
 * mesma natureza de `users`/`consent_records`) — publicado por Admin
 * Rotta, lido por todo mundo que recebeu o broadcast.
 */
export interface AnnouncementRepository {
  create(data: CreateAnnouncementData): Promise<AnnouncementWithAutor>;
  list(filter: ListAnnouncementsFilter): Promise<ListAnnouncementsResult>;
}
