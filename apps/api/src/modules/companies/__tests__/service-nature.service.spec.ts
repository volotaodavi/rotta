import { ForbiddenException } from "@nestjs/common";

import { ServiceNatureService } from "../service-nature.service";

import type { PrismaService } from "@/infra/database/prisma.service";

/**
 * A separação entre as duas verticais (25/09/2026: "faça a distinção,
 * por favor. Não quero mistura").
 *
 * Este serviço responde a uma pergunta só — "esta empresa cobra do
 * responsável?" — e é consultado de quatro lugares distantes
 * (marketplace, carteira, painel, credenciamento do aluno). O que os
 * testes aqui guardam é que a resposta errada nunca é a permissiva: o
 * erro caro é deixar passar uma cobrança num município que já pagou.
 */
function criarServico(naturezaServico: string | null) {
  const findUnique = jest
    .fn()
    .mockResolvedValue(naturezaServico === null ? null : { naturezaServico });
  const prisma = {
    withBypass: jest.fn((op: unknown) => op),
    company: { findUnique },
  } as unknown as PrismaService;
  return { service: new ServiceNatureService(prisma), findUnique };
}

describe("quem paga pelo transporte", () => {
  it("empresa PRIVADA deixa o fluxo comercial passar", async () => {
    // Este é o teste que protege TODA a base atual. Se cair, alguma
    // transportadora que vive de mensalidade parou de poder cobrar.
    const { service } = criarServico("PRIVADO");

    await expect(
      service.assertCobrancaPermitida("company-1", "Gerar contrato"),
    ).resolves.toBeUndefined();
    await expect(service.ehPublicoLicitado("company-1")).resolves.toBe(false);
  });

  it("empresa LICITADA barra o fluxo comercial", async () => {
    const { service } = criarServico("PUBLICO_LICITADO");

    await expect(service.assertCobrancaPermitida("company-1", "Gerar contrato")).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("a mensagem do bloqueio nomeia a ação e explica a vertente", async () => {
    // Um "Forbidden" seco faria o gestor abrir chamado achando que é
    // bug. A mensagem tem de dizer que a vertente dele não tem esse
    // gesto, e o que fazer se ele realmente atende particulares.
    const { service } = criarServico("PUBLICO_LICITADO");

    await expect(
      service.assertCobrancaPermitida("company-1", "Gerar contrato com mensalidade"),
    ).rejects.toThrow(/Gerar contrato com mensalidade.*município custeia/s);
  });

  it("empresa inexistente cai em PRIVADO — o padrão seguro é o que já existia", async () => {
    // Quem chama este serviço está sempre prestes a decidir se COBRA.
    // Diante de uma empresa que não existe, seguir o caminho de sempre
    // é mais seguro do que abrir a exceção da gratuidade por engano.
    const { service } = criarServico(null);

    await expect(service.ehPublicoLicitado("fantasma")).resolves.toBe(false);
    await expect(service.assertCobrancaPermitida("fantasma", "x")).resolves.toBeUndefined();
  });

  it("lê pelo companyId pedido, nunca pelo tenant ambiente", async () => {
    // `companies` tem RLS pela própria id, e este serviço roda de
    // dentro de listeners sem tenant nenhum. O `where` explícito é o
    // que garante que o bypass não alarga nada.
    const { service, findUnique } = criarServico("PRIVADO");

    await service.natureza("company-9");

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "company-9" } }),
    );
  });
});
