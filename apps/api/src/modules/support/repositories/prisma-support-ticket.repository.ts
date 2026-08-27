import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/infra/database/prisma.service";

import { SUPPORT_TICKET_INCLUDE } from "./support-ticket.repository";

import type {
  CreateSupportTicketData,
  ListSupportTicketsFilter,
  ListSupportTicketsResult,
  SupportTicketRepository,
  SupportTicketWithRelations,
  UpdateSupportTicketStatusData,
} from "./support-ticket.repository";
import type { Prisma } from "@prisma/client";

@Injectable()
export class PrismaSupportTicketRepository implements SupportTicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSupportTicketData): Promise<SupportTicketWithRelations> {
    return this.prisma.withTenant(
      this.prisma.supportTicket.create({ data, include: SUPPORT_TICKET_INCLUDE }),
    );
  }

  createBypass(data: CreateSupportTicketData): Promise<SupportTicketWithRelations> {
    return this.prisma.withBypass(
      this.prisma.supportTicket.create({ data, include: SUPPORT_TICKET_INCLUDE }),
    );
  }

  findById(
    id: string,
    companyId?: string,
    abertoPorUserId?: string,
  ): Promise<SupportTicketWithRelations | null> {
    const where: Prisma.SupportTicketWhereInput = {
      id,
      ...(companyId ? { companyId } : {}),
      ...(abertoPorUserId ? { abertoPorUserId } : {}),
    };
    const operation = this.prisma.supportTicket.findFirst({
      where,
      include: SUPPORT_TICKET_INCLUDE,
    });
    // Sem `companyId` = Admin Rotta cross-tenant OU Responsável (escopado
    // por `abertoPorUserId` no `where` acima) — mesma justificativa de
    // `PrismaAuditLogRepository.listByEntity`.
    return companyId ? this.prisma.withTenant(operation) : this.prisma.withBypass(operation);
  }

  async list(filter: ListSupportTicketsFilter): Promise<ListSupportTicketsResult> {
    const where: Prisma.SupportTicketWhereInput = {
      ...(filter.companyId ? { companyId: filter.companyId } : {}),
      ...(filter.abertoPorUserId ? { abertoPorUserId: filter.abertoPorUserId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.categoria ? { categoria: filter.categoria } : {}),
    };

    const findManyOp = this.prisma.supportTicket.findMany({
      where,
      include: SUPPORT_TICKET_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    });
    const countOp = this.prisma.supportTicket.count({ where });

    // Sem `companyId` = Admin Rotta cross-tenant OU Responsável (escopado
    // por `abertoPorUserId`) — mesmo padrão de
    // `PrismaAuditLogRepository.list`/`listByEntity`.
    const [items, total] = filter.companyId
      ? await Promise.all([this.prisma.withTenant(findManyOp), this.prisma.withTenant(countOp)])
      : await Promise.all([this.prisma.withBypass(findManyOp), this.prisma.withBypass(countOp)]);

    return { items, total };
  }

  updateStatus(
    id: string,
    data: UpdateSupportTicketStatusData,
  ): Promise<SupportTicketWithRelations> {
    return this.prisma.withTenant(
      this.prisma.supportTicket.update({ where: { id }, data, include: SUPPORT_TICKET_INCLUDE }),
    );
  }

  updateStatusBypass(
    id: string,
    data: UpdateSupportTicketStatusData,
  ): Promise<SupportTicketWithRelations> {
    return this.prisma.withBypass(
      this.prisma.supportTicket.update({ where: { id }, data, include: SUPPORT_TICKET_INCLUDE }),
    );
  }
}
