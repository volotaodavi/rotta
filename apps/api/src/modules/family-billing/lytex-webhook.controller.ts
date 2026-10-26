import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { FAMILY_CONTRACT_ID_PREFIX, FAMILY_INVOICE_ID_PREFIX } from "./family-billing.constants";
import { FamilyBillingService } from "./family-billing.service";

import type { LytexWebhookEventRepository } from "@/modules/lytex/repositories/lytex-webhook-event.repository";
import type { LytexInvoice, LytexWebhookEnvelope } from "@/modules/lytex/types/lytex.types";

import { Public } from "@/common/decorators/public.decorator";
import { SemRateLimit } from "@/common/decorators/sem-rate-limit.decorator";
import { LytexWebhookGuard } from "@/modules/lytex/lytex-webhook.guard";
import { LYTEX_WEBHOOK_EVENT_REPOSITORY } from "@/modules/lytex/repositories/lytex-webhook-event.repository";
import { extrairFaturaDoWebhook, nomeDoEventoDoWebhook } from "@/modules/lytex/types/lytex.types";

/**
 * O que a Lytex avisa sobre as cobranças da mensalidade da família.
 *
 * ## Por que este controlador mora no módulo da família
 *
 * Porque é o fluxo dela, e porque `FamilyBillingModule` já importa
 * `LytexModule` (pelo cliente HTTP e pelo serviço de subconta). Pôr o
 * controlador do lado de lá exigiria chamar de volta e fechar o ciclo
 * entre os dois módulos, que foi o que obrigou o desenho do Asaas a usar
 * barramento de eventos. Aqui a dependência é de mão única, e o
 * controlador chama o serviço direto.
 *
 * ## Responder 200 é a regra, e não gentileza
 *
 * Toda provedora de pagamento pausa a fila de entrega depois de uma
 * sequência de respostas que não são 200. Fila pausada significa
 * pagamento confirmado que nunca chega, e a família vendo "a vencer" uma
 * fatura que ela já pagou. Por isso aqui:
 *
 * - corpo que não dá para entender vira aviso no log e 200;
 * - cobrança que não é de nenhuma fatura da Rotta vira aviso e 200;
 * - **falha ao gravar propaga**, e aí sim o 500 é o certo: nesse caso a
 *   reentrega resolve, e engolir o erro perderia o pagamento para
 *   sempre.
 *
 * ## O formato do corpo não é documentado
 *
 * A Lytex descreve o webhook em prosa e não publica o esquema do corpo
 * (não há `x-webhooks` no OpenAPI dela). Então a leitura é tolerante:
 * `extrairFaturaDoWebhook` aceita a fatura crua, `{event, data}` e
 * `{event, invoice}`. O que não encaixar em nenhum dos três é registrado
 * com o corpo recebido, que é o que permite acertar isso com uma entrega
 * real em mãos em vez de com adivinhação.
 */
@ApiExcludeController()
/* Webhook de provedora: chega de IP próprio e já passa pelo token do
   guard. Ver `sem-rate-limit.decorator.ts`. */
@SemRateLimit()
@Controller("webhooks/lytex")
@Public()
@UseGuards(LytexWebhookGuard)
export class LytexWebhookController {
  private readonly logger = new Logger(LytexWebhookController.name);

  constructor(
    private readonly familyBillingService: FamilyBillingService,
    @Inject(LYTEX_WEBHOOK_EVENT_REPOSITORY)
    private readonly webhookEventRepository: LytexWebhookEventRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(@Body() corpo: LytexWebhookEnvelope): Promise<{ ok: true }> {
    const fatura = extrairFaturaDoWebhook(corpo ?? {});
    const evento = nomeDoEventoDoWebhook(corpo ?? {});

    if (!fatura) {
      this.logger.warn(
        `Webhook da Lytex sem cobranca identificavel no corpo (evento "${evento}"). Corpo recebido: ${JSON.stringify(corpo).slice(0, 500)}`,
      );
      return { ok: true };
    }

    /*
      A idempotência da Lytex é diferente da do Asaas, e a diferença é a
      ausência de um id de evento garantido. A chave usada é o par
      `<faturaId>:<status>`, que é exatamente o que muda alguma coisa
      aqui dentro:

      - a mesma entrega repetida tem o mesmo par, e sai sem escrever;
      - a cobrança que foi criada e depois paga tem dois pares
        diferentes, e os dois são processados, que é o certo.

      Quando a Lytex mandar um id de evento, ele é usado no lugar, e aí a
      proteção fica igual à do Asaas.
    */
    const chave =
      corpo.event && corpo.data
        ? `${evento}:${fatura._id}`
        : `${fatura._id}:${fatura.status ?? "sem-status"}`;

    if (await this.webhookEventRepository.jaRecebido(chave)) {
      this.logger.log(`Webhook da Lytex ${chave} ja havia sido recebido: reentrega ignorada.`);
      return { ok: true };
    }

    await this.processar(fatura, evento);

    await this.webhookEventRepository.registrar({
      id: chave,
      evento: evento.slice(0, 64),
      recursoId: fatura._id,
    });
    await this.webhookEventRepository.marcarProcessado(chave);

    return { ok: true };
  }

  /**
   * O que fazer com a cobrança, decidido pelo `status` dela.
   *
   * O estado é lido da fatura, e não do nome do evento, pelo mesmo
   * motivo que já valia no Asaas: nome de evento muda e se multiplica,
   * estado é um só. `paid` credita, `refund` e `chargeback` estornam, e
   * `waitingPayment` numa cobrança gerada pela recorrência é o momento
   * de ligá-la ao mês.
   */
  private async processar(fatura: LytexInvoice, evento: string): Promise<void> {
    const referencia = fatura.referenceId ?? "";

    if (fatura.status === "paid") {
      const valorPagoCentavos = fatura.paymentData?.value ?? fatura.totalValue;
      const liquido = fatura.paymentData?.liquidValue ?? null;

      await this.familyBillingService.confirmarPagamento({
        lytexInvoiceId: fatura._id,
        valorPagoCentavos,
        /* A taxa sai do líquido que a própria Lytex informa, nunca de um
           percentual estimado por nós. Sem `liquidValue`, fica `null`:
           desconhecida é melhor que inventada. */
        taxaDoProvedorCentavos: liquido !== null ? valorPagoCentavos - liquido : null,
        pagoEm: fatura.paymentData?.payedAt ? new Date(fatura.paymentData.payedAt) : new Date(),
      });
      return;
    }

    if (fatura.status === "refund" || fatura.status === "chargeback") {
      await this.familyBillingService.registrarEstorno(fatura._id);
      return;
    }

    /* Cobrança gerada pela RECORRÊNCIA de um contrato. O prefixo aponta
       para o contrato, e não para uma fatura, porque toda cobrança que a
       recorrência gera herda a mesma referência: se ela identificasse um
       mês, todos os meses chegariam dizendo ser o mesmo. Quem identifica
       a competência é o vencimento. */
    if (referencia.startsWith(FAMILY_CONTRACT_ID_PREFIX)) {
      if (!fatura._subscriptionId || !fatura.dueDate) {
        this.logger.warn(
          `Cobranca ${fatura._id} com referencia de contrato mas sem _subscriptionId ou dueDate: nao da para saber de qual recorrencia nem de qual mes. Nada foi ligado.`,
        );
        return;
      }

      await this.familyBillingService.vincularCobrancaDaAssinatura({
        evento,
        lytexSubscriptionId: fatura._subscriptionId,
        lytexInvoiceId: fatura._id,
        contractId: referencia.slice(FAMILY_CONTRACT_ID_PREFIX.length),
        /* Só a data: o campo da Lytex é ISO com hora, e a competência é
           calculada a partir do dia em UTC. */
        vencimento: fatura.dueDate.slice(0, 10),
        valorCentavos: fatura.totalValue,
        linkDaFatura: fatura.linkCheckout ?? null,
        linhaDigitavel: fatura.paymentMethods?.boleto?.digitableLine ?? null,
        meioDePagamento: fatura.paymentData?.paymentMethod ?? null,
      });
      return;
    }

    if (referencia.startsWith(FAMILY_INVOICE_ID_PREFIX)) {
      this.logger.debug(
        `Cobranca avulsa ${fatura._id} com status "${fatura.status ?? "sem status"}" (evento "${evento}"): nada a aplicar, a fatura ja existe do nosso lado.`,
      );
      return;
    }

    this.logger.debug(
      `Cobranca ${fatura._id} sem referencia da Rotta ("${referencia}"), evento "${evento}": ignorada de proposito.`,
    );
  }
}
