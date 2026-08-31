import type { Conversation, ConversationMessage } from "@prisma/client";

export type ConversationMessageWithAutor = ConversationMessage & { autor: { nome: string } };

export interface CreateConversationMessageData {
  conversationId: string;
  autorUserId: string;
  autorRole: string;
  mensagem: string;
}

export interface ListConversationMessagesResult {
  items: ConversationMessageWithAutor[];
  total: number;
}

/**
 * Sem RLS, mesma razão de `StudentAddressOverrideRepository` — o
 * acesso trava por `responsavelId`/`motoristaId`/`monitorId` do
 * `Contract` (`ConversationsService`), nunca por `companyId` sozinho.
 * `findOrCreateByContractId` é `upsert`-like (uma única conversa por
 * `Contract`, `@@unique([contractId])`), mas usa `findFirst` + `create`
 * separados em vez de `upsert` (não há campos a atualizar num
 * "encontrar de novo" — `Conversation` não tem estado próprio além do
 * vínculo).
 */
export interface ConversationRepository {
  findByContractId(contractId: string): Promise<Conversation | null>;
  create(contractId: string): Promise<Conversation>;
  createMessage(data: CreateConversationMessageData): Promise<ConversationMessageWithAutor>;
  listMessages(
    conversationId: string,
    page: number,
    pageSize: number,
  ): Promise<ListConversationMessagesResult>;
  countUnread(conversationId: string, forUserId: string): Promise<number>;
  markAllAsRead(conversationId: string, readerUserId: string): Promise<number>;
}
