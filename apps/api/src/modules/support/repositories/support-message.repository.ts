import type { Prisma } from "@prisma/client";

export const SUPPORT_MESSAGE_INCLUDE = {
  autor: { select: { id: true, nome: true } },
} satisfies Prisma.SupportMessageInclude;

export type SupportMessageWithRelations = Prisma.SupportMessageGetPayload<{
  include: typeof SUPPORT_MESSAGE_INCLUDE;
}>;

export interface CreateSupportMessageData {
  ticketId: string;
  companyId: string;
  /** Ausente só na resposta automática da Rotta AI (`autorIsIA: true`). */
  autorUserId?: string;
  autorIsAdminRotta: boolean;
  autorIsIA?: boolean;
  mensagem: string;
  anexoUrl?: string;
}

export interface SupportMessageRepository {
  create(data: CreateSupportMessageData): Promise<SupportMessageWithRelations>;
  listByTicket(ticketId: string, companyId?: string): Promise<SupportMessageWithRelations[]>;
}
