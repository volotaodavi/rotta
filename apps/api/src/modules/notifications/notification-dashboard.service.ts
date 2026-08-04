import { Inject, Injectable } from "@nestjs/common";
import { NotificationDeliveryStatus } from "@prisma/client";


import {
  NOTIFICATION_DELIVERY_ATTEMPT_REPOSITORY,
  NOTIFICATION_REPOSITORY,
} from "./notifications.constants";

import type { CommunicationDashboardQueryDto } from "./dto/communication-dashboard-query.dto";
import type {
  ChannelDeliveryStatsDto,
  CommunicationDashboardResponseDto,
} from "./dto/communication-dashboard-response.dto";
import type {
  DeliveryStatsByCompanyRow,
  NotificationDeliveryAttemptRepository,
} from "./repositories/notification-delivery-attempt.repository";
import type { NotificationRepository } from "./repositories/notification.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { CommunicationChannel } from "@prisma/client";

import { CompaniesService } from "@/modules/companies/companies.service";

interface ChannelAccumulator {
  total: number;
  entregues: number;
  falharam: number;
  respostaMsSomaPonderada: number;
  respostaMsPeso: number;
}

/**
 * Dashboard de comunicação (briefing "MÓDULO — ROTTA COMMUNICATION
 * ENGINE" — métricas agregadas por empresa). Reusa
 * `CompaniesService.findByIdOrThrow` para o MESMO RBAC de
 * `CompaniesService.getDashboard` (Admin Rotta qualquer empresa,
 * Empresa/Gestor só a própria, 404 nunca 403 fora do escopo) — nunca
 * duplica essa checagem aqui.
 */
@Injectable()
export class NotificationDashboardService {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
    @Inject(NOTIFICATION_DELIVERY_ATTEMPT_REPOSITORY)
    private readonly deliveryAttemptRepository: NotificationDeliveryAttemptRepository,
    private readonly companiesService: CompaniesService,
  ) {}

  async getDashboard(
    companyId: string,
    actor: AuthenticatedUser,
    query: CommunicationDashboardQueryDto,
  ): Promise<CommunicationDashboardResponseDto> {
    await this.companiesService.findByIdOrThrow(companyId, actor);

    const filter = { desde: query.desde ? new Date(query.desde) : undefined };

    const [counts, porPrioridadeRows, porTipoRows, porCanalRows, deliveryRows] = await Promise.all([
      this.notificationRepository.countByCompany(companyId, filter),
      this.notificationRepository.countByPriority(companyId, filter),
      this.notificationRepository.countByType(companyId, filter),
      this.notificationRepository.countByChannel(companyId, filter),
      this.deliveryAttemptRepository.statsByCompany(companyId, filter),
    ]);

    const porPrioridade: Record<string, number> = {};
    for (const row of porPrioridadeRows) porPrioridade[row.prioridade] = row.total;

    const porTipo: Record<string, number> = {};
    for (const row of porTipoRows) porTipo[row.tipo] = row.total;

    const porCanalEscolhido: Record<string, number> = {};
    for (const row of porCanalRows) porCanalEscolhido[row.canal] = row.total;

    return {
      totalEnviadas: counts.total,
      lidas: counts.lidas,
      favoritadas: counts.favoritadas,
      arquivadas: counts.arquivadas,
      porPrioridade,
      porTipo,
      porCanalEscolhido,
      entregasPorCanal: this.aggregateDeliveryStats(deliveryRows),
      desde: query.desde,
    };
  }

  /** Consolida tentativas (que chegam quebradas por canal + status, ver `statsByCompany`) em uma única linha por canal. */
  private aggregateDeliveryStats(rows: DeliveryStatsByCompanyRow[]): ChannelDeliveryStatsDto[] {
    const byChannel = new Map<CommunicationChannel, ChannelAccumulator>();

    for (const row of rows) {
      const entry: ChannelAccumulator = byChannel.get(row.canal) ?? {
        total: 0,
        entregues: 0,
        falharam: 0,
        respostaMsSomaPonderada: 0,
        respostaMsPeso: 0,
      };

      entry.total += row.total;
      if (
        row.status === NotificationDeliveryStatus.ENTREGUE ||
        row.status === NotificationDeliveryStatus.LIDA
      ) {
        entry.entregues += row.total;
        if (row.tempoRespostaMedioMs !== null) {
          entry.respostaMsSomaPonderada += row.tempoRespostaMedioMs * row.total;
          entry.respostaMsPeso += row.total;
        }
      }
      if (row.status === NotificationDeliveryStatus.FALHOU) {
        entry.falharam += row.total;
      }

      byChannel.set(row.canal, entry);
    }

    return [...byChannel.entries()].map(([canal, stats]) => ({
      canal,
      total: stats.total,
      entregues: stats.entregues,
      falharam: stats.falharam,
      taxaSucesso: stats.total > 0 ? stats.entregues / stats.total : 0,
      tempoRespostaMedioMs:
        stats.respostaMsPeso > 0 ? stats.respostaMsSomaPonderada / stats.respostaMsPeso : null,
    }));
  }
}
