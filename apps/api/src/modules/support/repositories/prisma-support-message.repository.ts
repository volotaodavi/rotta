import { Injectable } from "@nestjs/common";

import { SUPPORT_MESSAGE_INCLUDE } from "./support-message.repository";

import type {
  CreateSupportMessageData,
  SupportMessageRepository,
  SupportMessageWithRelations,
} from "./support-message.repository";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaSupportMessageRepository implements SupportMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSupportMessageData): Promise<SupportMessageWithRelations> {
    return this.prisma.withTenant(
      this.prisma.supportMessage.create({ data, include: SUPPORT_MESSAGE_INCLUDE }),
    );
  }

  listByTicket(ticketId: string, companyId?: string): Promise<SupportMessageWithRelations[]> {
    const operation = this.prisma.supportMessage.findMany({
      where: { ticketId, ...(companyId ? { companyId } : {}) },
      include: SUPPORT_MESSAGE_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
    return companyId ? this.prisma.withTenant(operation) : this.prisma.withBypass(operation);
  }
}
