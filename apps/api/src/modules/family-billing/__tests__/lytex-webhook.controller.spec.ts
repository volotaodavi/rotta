import { LytexWebhookController } from "../lytex-webhook.controller";

import type { FamilyBillingService } from "../family-billing.service";
import type { LytexWebhookEventRepository } from "@/modules/lytex/repositories/lytex-webhook-event.repository";

/*
  A Lytex nao publica o esquema do corpo do webhook: o OpenAPI dela
  descreve o webhook em prosa e nao traz `x-webhooks`, nem em sandbox nem
  em producao. Esta spec e o contrato que a Rotta assume no lugar disso,
  e e o que impede uma entrega real de formato diferente passar
  despercebida: tudo o que o controlador aceita esta aqui, com nome.

  A regra que atravessa tudo: responder 200 e obrigacao, nao gentileza.
  Toda provedora pausa a fila de entrega depois de uma sequencia de
  respostas que nao sao 200, e fila pausada e pagamento confirmado que
  nunca chega, com a familia vendo "a vencer" uma fatura que ela pagou.
*/
describe("LytexWebhookController", () => {
  let familyBillingService: jest.Mocked<
    Pick<
      FamilyBillingService,
      "confirmarPagamento" | "registrarEstorno" | "vincularCobrancaDaAssinatura"
    >
  >;
  let repositorio: jest.Mocked<LytexWebhookEventRepository>;
  let controller: LytexWebhookController;

  beforeEach(() => {
    familyBillingService = {
      confirmarPagamento: jest.fn().mockResolvedValue(undefined),
      registrarEstorno: jest.fn().mockResolvedValue(undefined),
      vincularCobrancaDaAssinatura: jest.fn().mockResolvedValue(undefined),
    };
    repositorio = {
      jaRecebido: jest.fn().mockResolvedValue(false),
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarProcessado: jest.fn().mockResolvedValue(undefined),
    };

    controller = new LytexWebhookController(
      familyBillingService as unknown as FamilyBillingService,
      repositorio,
    );
  });

  const paga = {
    _id: "inv_1",
    status: "paid" as const,
    referenceId: "fatura:fatura-1",
    totalValue: 66_000,
    dueDate: "2026-04-05T00:00:00.000Z",
    paymentData: {
      paymentMethod: "pix",
      payedAt: "2026-04-03T12:00:00.000Z",
      value: 66_000,
      liquidValue: 65_815,
    },
  };

  describe("formatos de corpo aceitos", () => {
    it("a fatura crua no corpo", async () => {
      await expect(controller.handle(paga)).resolves.toEqual({ ok: true });
      expect(familyBillingService.confirmarPagamento).toHaveBeenCalled();
    });

    it("a fatura dentro de `data`, com o nome do evento ao lado", async () => {
      await controller.handle({ event: "invoicePaid", data: paga });

      expect(familyBillingService.confirmarPagamento).toHaveBeenCalled();
    });

    it("a fatura dentro de `invoice`", async () => {
      await controller.handle({ event: "invoicePaid", invoice: paga });

      expect(familyBillingService.confirmarPagamento).toHaveBeenCalled();
    });

    /* Corpo que nao da para entender vira aviso no log e 200, nunca
       excecao: nao-200 repetido pausa a fila inteira. */
    it("corpo sem cobranca identificavel responde 200 e nao faz nada", async () => {
      await expect(controller.handle({ event: "algo", data: undefined })).resolves.toEqual({
        ok: true,
      });

      expect(familyBillingService.confirmarPagamento).not.toHaveBeenCalled();
      expect(repositorio.registrar).not.toHaveBeenCalled();
    });
  });

  describe("o que cada estado faz", () => {
    /* A taxa sai do liquido que a propria Lytex informa, nunca de um
       percentual estimado por nos. */
    it("paga confirma o pagamento com a taxa derivada do liquido", async () => {
      await controller.handle(paga);

      expect(familyBillingService.confirmarPagamento).toHaveBeenCalledWith({
        lytexInvoiceId: "inv_1",
        valorPagoCentavos: 66_000,
        taxaDoProvedorCentavos: 185,
        pagoEm: new Date("2026-04-03T12:00:00.000Z"),
      });
    });

    /* Sem `liquidValue`, desconhecida e melhor que inventada. */
    it("sem o liquido, a taxa fica nula", async () => {
      await controller.handle({ ...paga, paymentData: { value: 66_000 } });

      expect(familyBillingService.confirmarPagamento).toHaveBeenCalledWith(
        expect.objectContaining({ taxaDoProvedorCentavos: null }),
      );
    });

    it("estorno e chargeback registram estorno", async () => {
      await controller.handle({ ...paga, _id: "inv_2", status: "refund" });
      await controller.handle({ ...paga, _id: "inv_3", status: "chargeback" });

      expect(familyBillingService.registrarEstorno).toHaveBeenCalledWith("inv_2");
      expect(familyBillingService.registrarEstorno).toHaveBeenCalledWith("inv_3");
    });

    /*
      O prefixo aponta para o CONTRATO, e nao para uma fatura, porque
      toda cobranca que a recorrencia gera herda a mesma referencia: se
      ela identificasse um mes, todos os meses chegariam dizendo ser o
      mesmo. Quem identifica a competencia e o vencimento.
    */
    it("cobranca gerada pela recorrencia e ligada ao mes", async () => {
      await controller.handle({
        event: "invoiceCreate",
        data: {
          _id: "inv_maio",
          _subscriptionId: "sub_1",
          status: "waitingPayment",
          referenceId: "contrato:contrato-1",
          totalValue: 66_000,
          dueDate: "2026-05-05T23:59:59.000Z",
          linkCheckout: "https://pay.lytex.test/i/abc",
        },
      });

      expect(familyBillingService.vincularCobrancaDaAssinatura).toHaveBeenCalledWith(
        expect.objectContaining({
          lytexSubscriptionId: "sub_1",
          lytexInvoiceId: "inv_maio",
          contractId: "contrato-1",
          /* So a data: o campo da Lytex e ISO com hora, e a competencia
             sai do dia em UTC. */
          vencimento: "2026-05-05",
        }),
      );
    });

    it("sem _subscriptionId ou sem dueDate, nada e ligado", async () => {
      await controller.handle({
        event: "invoiceCreate",
        data: {
          _id: "inv_maio",
          status: "waitingPayment",
          referenceId: "contrato:contrato-1",
          totalValue: 66_000,
          dueDate: "2026-05-05T00:00:00.000Z",
        },
      });

      expect(familyBillingService.vincularCobrancaDaAssinatura).not.toHaveBeenCalled();
    });

    it("cobranca que nao e da Rotta e ignorada", async () => {
      await controller.handle({ _id: "inv_de_outro", status: "waitingPayment" });

      expect(familyBillingService.confirmarPagamento).not.toHaveBeenCalled();
      expect(familyBillingService.vincularCobrancaDaAssinatura).not.toHaveBeenCalled();
    });
  });

  describe("idempotencia", () => {
    /*
      Sem id de evento garantido, a chave e o par `<faturaId>:<status>`:
      a mesma entrega repetida tem o mesmo par e sai sem escrever, e a
      cobranca que foi criada e depois paga tem dois pares diferentes,
      que e exatamente o que se quer.
    */
    it("a chave sem evento e a fatura somada ao status", async () => {
      await controller.handle(paga);

      expect(repositorio.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ id: "inv_1:paid", recursoId: "inv_1" }),
      );
      expect(repositorio.marcarProcessado).toHaveBeenCalledWith("inv_1:paid");
    });

    it("com nome de evento no envelope, a chave usa o evento", async () => {
      await controller.handle({ event: "invoicePaid", data: paga });

      expect(repositorio.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ id: "invoicePaid:inv_1" }),
      );
    });

    it("reentrega do mesmo par nao reprocessa nada", async () => {
      repositorio.jaRecebido.mockResolvedValue(true);

      await expect(controller.handle(paga)).resolves.toEqual({ ok: true });

      expect(familyBillingService.confirmarPagamento).not.toHaveBeenCalled();
      expect(repositorio.registrar).not.toHaveBeenCalled();
    });

    /*
      Processa primeiro e registra depois, e nao o contrario: registrar
      antes reservaria a chave, e uma falha no meio deixaria o evento
      marcado como visto sem nada ter acontecido. A reentrega, que e
      justamente a chance de consertar, seria descartada.
    */
    it("falha no processamento nao registra o evento", async () => {
      familyBillingService.confirmarPagamento.mockRejectedValue(new Error("banco fora"));

      await expect(controller.handle(paga)).rejects.toThrow("banco fora");

      expect(repositorio.registrar).not.toHaveBeenCalled();
    });
  });
});
