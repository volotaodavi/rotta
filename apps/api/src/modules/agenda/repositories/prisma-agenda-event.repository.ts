import { Injectable } from "@nestjs/common";

import type {
  AgendaEventRepository,
  CreateAgendaEventData,
  ListAgendaEventsFilter,
  ListAgendaEventsResult,
  UpdateAgendaEventData,
} from "./agenda-event.repository";
import type { EventoAgenda, Prisma } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaAgendaEventRepository implements AgendaEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateAgendaEventData): Promise<EventoAgenda> {
    return this.prisma.withTenant(this.prisma.eventoAgenda.create({ data }));
  }

  findById(id: string): Promise<EventoAgenda | null> {
    return this.prisma.withTenant(this.prisma.eventoAgenda.findUnique({ where: { id } }));
  }

  update(id: string, data: UpdateAgendaEventData): Promise<EventoAgenda> {
    return this.prisma.withTenant(this.prisma.eventoAgenda.update({ where: { id }, data }));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.withTenant(this.prisma.eventoAgenda.delete({ where: { id } }));
  }

  async list(filter: ListAgendaEventsFilter): Promise<ListAgendaEventsResult> {
    const where: Prisma.EventoAgendaWhereInput = {
      companyId: filter.companyId,
      ...(filter.tipo ? { tipo: filter.tipo } : {}),
      ...(filter.de || filter.ate ? { AND: this.rangeFilter(filter.de, filter.ate) } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.eventoAgenda.findMany({
          where,
          orderBy: { data: "asc" },
          skip: (filter.page - 1) * filter.pageSize,
          take: filter.pageSize,
        }),
      ),
      this.prisma.withTenant(this.prisma.eventoAgenda.count({ where })),
    ]);

    return { items, total };
  }

  /**
   * Um evento "cruza" [`de`, `ate`] quando seu intervalo — [`data`,
   * `dataFim` ?? `data`] — intersecta o período pedido. `dataFim` nulo
   * (evento de um dia só) usa `data` nos dois lados da comparação.
   */
  private rangeFilter(de?: Date, ate?: Date): Prisma.EventoAgendaWhereInput[] {
    const conditions: Prisma.EventoAgendaWhereInput[] = [];
    if (ate) {
      conditions.push({ data: { lte: ate } });
    }
    if (de) {
      conditions.push({
        OR: [{ dataFim: { gte: de } }, { dataFim: null, data: { gte: de } }],
      });
    }
    return conditions;
  }
}
