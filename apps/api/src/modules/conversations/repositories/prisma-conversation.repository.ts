import { Injectable } from "@nestjs/common";


import type {
  ConversationMessageWithAutor,
  ConversationRepository,
  CreateConversationMessageData,
  ListConversationMessagesResult,
} from "./conversation.repository";
import type { Conversation } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaConversationRepository implements ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByContractId(contractId: string): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({ where: { contractId } });
  }

  create(contractId: string): Promise<Conversation> {
    return this.prisma.conversation.create({ data: { contractId } });
  }

  createMessage(data: CreateConversationMessageData): Promise<ConversationMessageWithAutor> {
    return this.prisma.conversationMessage.create({
      data,
      include: { autor: { select: { nome: true } } },
    });
  }

  async listMessages(
    conversationId: string,
    page: number,
    pageSize: number,
  ): Promise<ListConversationMessagesResult> {
    const [items, total] = await Promise.all([
      this.prisma.conversationMessage.findMany({
        where: { conversationId },
        include: { autor: { select: { nome: true } } },
        // Mais recente primeiro (paginação "carregar mais antigas",
        // padrão de qualquer chat) — inverter pra ordem cronológica é
        // responsabilidade do mapper/frontend, nunca da query.
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.conversationMessage.count({ where: { conversationId } }),
    ]);
    return { items, total };
  }

  countUnread(conversationId: string, forUserId: string): Promise<number> {
    return this.prisma.conversationMessage.count({
      where: { conversationId, autorUserId: { not: forUserId }, lidaEm: null },
    });
  }

  async markAllAsRead(conversationId: string, readerUserId: string): Promise<number> {
    const { count } = await this.prisma.conversationMessage.updateMany({
      where: { conversationId, autorUserId: { not: readerUserId }, lidaEm: null },
      data: { lidaEm: new Date() },
    });
    return count;
  }
}
