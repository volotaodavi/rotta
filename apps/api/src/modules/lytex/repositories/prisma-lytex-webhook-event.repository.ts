import { Injectable } from "@nestjs/common";

import type {
  LytexWebhookEventRepository,
  RegistrarEventoLytexData,
} from "./lytex-webhook-event.repository";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaLytexWebhookEventRepository implements LytexWebhookEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  /*
    Sem `withTenant`/`withBypass`: a tabela não tem RLS (ver o model em
    `schema.prisma`), e quem chama é o webhook, que não tem contexto de
    tenant. Envolver numa transação de `set_config` seria pagar uma ida
    a mais ao banco para proteger uma tabela sem política.
  */

  async jaRecebido(id: string): Promise<boolean> {
    const existente = await this.prisma.lytexWebhookEvent.findUnique({
      where: { id },
      select: { id: true },
    });
    return existente !== null;
  }

  async registrar(data: RegistrarEventoLytexData): Promise<void> {
    /* `skipDuplicates` em vez de `create`: duas entregas simultâneas do
       mesmo evento são possíveis, e a segunda não é um erro a propagar.
       Ela é exatamente o caso que esta tabela existe para absorver. */
    await this.prisma.lytexWebhookEvent.createMany({
      data: [{ id: data.id, evento: data.evento, recursoId: data.recursoId ?? null }],
      skipDuplicates: true,
    });
  }

  async marcarProcessado(id: string): Promise<void> {
    await this.prisma.lytexWebhookEvent.update({
      where: { id },
      data: { processadoEm: new Date() },
    });
  }
}
