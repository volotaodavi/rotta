import { Injectable, NotFoundException } from "@nestjs/common";


import type {
  CreateNotificationData,
  ListNotificationsFilter,
  ListNotificationsResult,
  NotificationRepository,
} from "./notification.repository";
import type { CommunicationChannel, Notification, Prisma } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

/**
 * Todo método aqui usa `withBypass` (nunca `withTenant`), exceto
 * `countByCompany`: o inbox é sempre pessoal (ver nota de arquitetura em
 * `NotificationRepository`), filtrado explicitamente por `userId` na
 * cláusula `where` — o bypass nunca abre uma consulta cross-usuário
 * arbitrária, só evita que a policy de RLS (por `companyId`) esconda uma
 * notificação pessoal sem `companyId`.
 */
@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateNotificationData): Promise<Notification> {
    return this.prisma.withBypass(
      this.prisma.notification.create({
        data: {
          userId: data.userId,
          companyId: data.companyId,
          tipo: data.tipo,
          prioridade: data.prioridade,
          titulo: data.titulo,
          corpo: data.corpo,
          dadosContexto: data.dadosContexto as Prisma.InputJsonValue | undefined,
          canaisEscolhidos: data.canaisEscolhidos,
        },
      }),
    );
  }

  findByIdForUser(id: string, userId: string): Promise<Notification | null> {
    return this.prisma.withBypass(this.prisma.notification.findFirst({ where: { id, userId } }));
  }

  findByIdInternal(id: string): Promise<Notification | null> {
    return this.prisma.withBypass(this.prisma.notification.findUnique({ where: { id } }));
  }

  addChannel(id: string, canal: CommunicationChannel): Promise<Notification> {
    return this.prisma.withBypass(
      this.prisma.notification.update({
        where: { id },
        data: { canaisEscolhidos: { push: canal } },
      }),
    );
  }

  async list(filter: ListNotificationsFilter): Promise<ListNotificationsResult> {
    const where: Prisma.NotificationWhereInput = {
      userId: filter.userId,
      arquivada: filter.arquivada,
      lida: filter.lida,
      favoritada: filter.favoritada,
      tipo: filter.tipo,
      ...(filter.search
        ? {
            OR: [
              { titulo: { contains: filter.search, mode: "insensitive" } },
              { corpo: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.withBypass(
        this.prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withBypass(this.prisma.notification.count({ where })),
    ]);

    return { items, total };
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    await this.assertOwnership(id, userId);
    return this.prisma.withBypass(
      this.prisma.notification.update({
        where: { id },
        data: { lida: true, lidaEm: new Date() },
      }),
    );
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.withBypass(
      this.prisma.notification.updateMany({
        where: { userId, lida: false },
        data: { lida: true, lidaEm: new Date() },
      }),
    );
    return result.count;
  }

  async setFavorita(id: string, userId: string, favoritada: boolean): Promise<Notification> {
    await this.assertOwnership(id, userId);
    return this.prisma.withBypass(
      this.prisma.notification.update({ where: { id }, data: { favoritada } }),
    );
  }

  async setArquivada(id: string, userId: string, arquivada: boolean): Promise<Notification> {
    await this.assertOwnership(id, userId);
    return this.prisma.withBypass(
      this.prisma.notification.update({ where: { id }, data: { arquivada } }),
    );
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.assertOwnership(id, userId);
    await this.prisma.withBypass(this.prisma.notification.delete({ where: { id } }));
  }

  async countByCompany(
    companyId: string,
    filter: { desde?: Date },
  ): Promise<{ total: number; lidas: number; favoritadas: number; arquivadas: number }> {
    const where: Prisma.NotificationWhereInput = {
      companyId,
      createdAt: filter.desde ? { gte: filter.desde } : undefined,
    };

    const [total, lidas, favoritadas, arquivadas] = await Promise.all([
      this.prisma.withTenant(this.prisma.notification.count({ where })),
      this.prisma.withTenant(this.prisma.notification.count({ where: { ...where, lida: true } })),
      this.prisma.withTenant(
        this.prisma.notification.count({ where: { ...where, favoritada: true } }),
      ),
      this.prisma.withTenant(
        this.prisma.notification.count({ where: { ...where, arquivada: true } }),
      ),
    ]);

    return { total, lidas, favoritadas, arquivadas };
  }

  /** Garante 404 (nunca 403) para notificação de outro usuário — mesmo princípio de não-enumeração do Dossiê 12 §7.4. */
  private async assertOwnership(id: string, userId: string): Promise<void> {
    const found = await this.prisma.withBypass(
      this.prisma.notification.findFirst({ where: { id, userId }, select: { id: true } }),
    );
    if (!found) {
      throw new NotFoundException("Notificação não encontrada.");
    }
  }
}
