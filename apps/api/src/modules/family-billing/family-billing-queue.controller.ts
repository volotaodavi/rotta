import { Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { FamilyBillingService, type ResultadoDaGeracao } from "./family-billing.service";

import { Public } from "@/common/decorators/public.decorator";
import { SemRateLimit } from "@/common/decorators/sem-rate-limit.decorator";
import { QstashSignatureGuard } from "@/infra/queue/qstash/qstash-signature.guard";

/**
 * "Worker" da cobrança da família — mesmo papel de
 * `BillingQueueController`: o QStash invoca este endpoint (agendamento
 * registrado por `FamilyBillingSchedulerService`), fora do ciclo de vida
 * de uma requisição de usuário. `@Public()` + `QstashSignatureGuard` é a
 * única defesa deste endpoint (ver o Guard para o porquê).
 */
@ApiExcludeController()
// Callback do QStash — rajada é o comportamento normal de uma fila.
@SemRateLimit()
@Controller("internal/queue/family-billing")
@Public()
@UseGuards(QstashSignatureGuard)
export class FamilyBillingQueueController {
  constructor(private readonly familyBillingService: FamilyBillingService) {}

  /**
   * Emite a fatura do mês para todo contrato ativo que ainda não tem, e
   * vira em `VENCIDA` o que passou do dia. Sem payload: a competência é
   * sempre a de hoje, nunca uma data vinda de fora — um mês errado aqui
   * emitiria cobrança de um mês que não foi prestado.
   */
  @Post("gerar-faturas")
  @HttpCode(HttpStatus.OK)
  async gerarFaturas(): Promise<{ ok: true; vencidas: number } & ResultadoDaGeracao> {
    const resultado = await this.familyBillingService.gerarFaturasDaCompetencia();
    const vencidas = await this.familyBillingService.marcarFaturasVencidas();
    return { ok: true, ...resultado, vencidas };
  }
}
