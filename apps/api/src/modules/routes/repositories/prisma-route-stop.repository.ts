import { Injectable } from "@nestjs/common";

import type {
  CreateRouteStopData,
  RouteStopRepository,
  UpdateRouteStopData,
} from "./route-stop.repository";
import type { RouteStop } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaRouteStopRepository implements RouteStopRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateRouteStopData): Promise<RouteStop> {
    return this.prisma.withTenant(this.prisma.routeStop.create({ data }));
  }

  /**
   * `createMany` do Prisma não devolve as linhas criadas — usa
   * `runInTenantTransaction` (uma transação interativa, `tx` explícito)
   * em vez de `withTenant` aqui: `withTenant` já é, ele próprio, um
   * `$transaction([...])` em lote — passar um SEGUNDO `$transaction`
   * como "operação" não tipa (nem funcionaria) porque não é mais um
   * único `PrismaPromise`. Sequencial (não `Promise.all`) porque as
   * queries compartilham a MESMA conexão da transação interativa.
   */
  async createMany(data: CreateRouteStopData[]): Promise<RouteStop[]> {
    return this.prisma.runInTenantTransaction(async (tx) => {
      const created: RouteStop[] = [];
      for (const item of data) {
        created.push(await tx.routeStop.create({ data: item }));
      }
      return created;
    });
  }

  findById(id: string): Promise<RouteStop | null> {
    return this.prisma.withTenant(this.prisma.routeStop.findUnique({ where: { id } }));
  }

  update(id: string, data: UpdateRouteStopData): Promise<RouteStop> {
    return this.prisma.withTenant(this.prisma.routeStop.update({ where: { id }, data }));
  }

  listByRoute(routeId: string): Promise<RouteStop[]> {
    return this.prisma.withTenant(
      this.prisma.routeStop.findMany({ where: { routeId }, orderBy: { ordem: "asc" } }),
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.withTenant(this.prisma.routeStop.delete({ where: { id } }));
  }

  /**
   * `routeId` não entra em nenhum `where` aqui: cada parada já se
   * identifica por `id` (RLS + `withTenant` já garantem que só paradas do
   * tenant corrente são visíveis/atualizáveis) — o parâmetro existe só
   * para deixar a assinatura explícita sobre o escopo da operação para
   * quem lê `RoutesService`.
   *
   * Duas fases dentro da MESMA transação, nunca uma sequência simples de
   * `update`: `RouteStop` tem `@@unique([routeId, ordem])` e o Postgres
   * não adia checagem de unicidade dentro de transação por padrão (Prisma
   * também não tem atributo de schema pra isso) — trocar A<->B de posição
   * com um único passe colide em cima do valor `ordem` que a outra parada
   * ainda ocupa. Fase 1 move todas as paradas pra um deslocamento negativo
   * (nunca ocupado, `ordem` é sempre `@Min(0)`) e sem colisão entre si
   * (`-1 - índice`, todos distintos); fase 2 aplica os valores finais,
   * já livres de qualquer conflito com o estado anterior.
   */
  async reorder(_routeId: string, ordered: { id: string; ordem: number }[]): Promise<void> {
    await this.prisma.runInTenantTransaction(async (tx) => {
      for (const [index, { id }] of ordered.entries()) {
        await tx.routeStop.update({ where: { id }, data: { ordem: -1 - index } });
      }
      for (const { id, ordem } of ordered) {
        await tx.routeStop.update({ where: { id }, data: { ordem } });
      }
    });
  }
}
