import { CompanyStatus } from "@prisma/client";

import { CobrancaService } from "../cobranca.service";

import type { PrismaService } from "@/infra/database/prisma.service";
import type { EmailService } from "@/infra/email/email.service";

/**
 * A cobrança manda e-mail para cliente de verdade. Quatro
 * comportamentos precisam estar travados, porque todos os quatro são
 * invisíveis em revisão de código e caros em produção:
 *
 * 1. **Não cobra duas vezes na mesma janela.** Régua que repete é spam,
 *    e spam de cobrança perde o cliente que só esqueceu de pagar.
 * 2. **Não carimba quando o envio falha.** Carimbar antes faria uma
 *    queda do provedor silenciar a empresa por três dias sem que
 *    ninguém tivesse sido avisado.
 * 3. **Sai do remetente do financeiro**, nunca do de notificação.
 * 4. **Leva o WhatsApp**, que é o caminho de resposta que o fundador
 *    autorizou.
 */
describe("CobrancaService", () => {
  const agora = Date.now();
  const diasAtras = (dias: number): Date => new Date(agora - dias * 86_400_000);

  let empresas: {
    id: string;
    nomeFantasia: string;
    status: CompanyStatus;
    updatedAt: Date;
    ultimaCobrancaEm: Date | null;
    email: string;
  }[];
  let atualizacoes: { id: string; data: Record<string, unknown> }[];
  let enviar: jest.Mock;

  function montar(): CobrancaService {
    const prisma = {
      runWithTenantContext: <T>(_ctx: unknown, fn: () => Promise<T>) => fn(),
      company: {
        findMany: jest.fn().mockImplementation(() => Promise.resolve(empresas)),
        findUnique: jest
          .fn()
          .mockImplementation(({ where }: { where: { id: string } }) =>
            Promise.resolve(empresas.find((e) => e.id === where.id) ?? null),
          ),
        update: jest
          .fn()
          .mockImplementation(({ where, data }: { where: { id: string }; data: unknown }) => {
            atualizacoes.push({ id: where.id, data: data as Record<string, unknown> });
            return Promise.resolve({});
          }),
      },
    } as unknown as PrismaService;

    const email = { sendEmail: enviar } as unknown as EmailService;
    return new CobrancaService(prisma, email);
  }

  beforeEach(() => {
    atualizacoes = [];
    enviar = jest.fn().mockResolvedValue({ ok: true });
    empresas = [
      {
        id: "a",
        nomeFantasia: "Van do Danilo",
        status: CompanyStatus.INADIMPLENTE,
        updatedAt: diasAtras(9),
        ultimaCobrancaEm: null,
        email: "danilo@example.com",
      },
      {
        id: "b",
        nomeFantasia: "Transporte Aurora",
        status: CompanyStatus.SUSPENSO,
        updatedAt: diasAtras(30),
        ultimaCobrancaEm: diasAtras(1),
        email: "aurora@example.com",
      },
    ];
  });

  it("marca quem pode ser cobrado agora e quem foi avisado há pouco", async () => {
    const pendencias = await montar().levantarPendencias();

    expect(pendencias.find((p) => p.companyId === "a")?.podeCobrarAgora).toBe(true);
    expect(pendencias.find((p) => p.companyId === "b")?.podeCobrarAgora).toBe(false);
  });

  it("não cobra de novo quem foi avisado dentro da janela", async () => {
    const resultado = await montar().cobrarPendencias();

    expect(resultado.enviadas).toBe(1);
    expect(resultado.puladas).toBe(1);
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(enviar.mock.calls[0][0]).toBe("danilo@example.com");
  });

  it("envia do remetente do financeiro, nunca do de notificação", async () => {
    await montar().cobrarPendencias();

    expect(enviar.mock.calls[0][3]).toBe("financeiro");
  });

  it("leva o WhatsApp do financeiro no corpo da mensagem", async () => {
    await montar().cobrarPendencias();

    const corpo = enviar.mock.calls[0][2] as string;
    expect(corpo).toContain("(21) 99709-9557");
    expect(corpo).toContain("wa.me/5521997099557");
    expect(corpo).toContain("financeiro@rottabr.com.br");
  });

  it("NÃO carimba a cobrança quando o envio falha", async () => {
    enviar.mockRejectedValue(new Error("provedor fora do ar"));

    const resultado = await montar().cobrarPendencias();

    expect(resultado.enviadas).toBe(0);
    expect(resultado.falhas).toBe(1);
    expect(atualizacoes).toHaveLength(0);
  });

  it("carimba a data só depois do envio aceito", async () => {
    await montar().cobrarPendencias();

    expect(atualizacoes).toHaveLength(1);
    expect(atualizacoes[0]?.id).toBe("a");
    expect(atualizacoes[0]?.data).toHaveProperty("ultimaCobrancaEm");
  });

  it("escapa o nome da empresa antes de colocar no HTML", async () => {
    empresas[0]!.nomeFantasia = 'Van <script>alert("x")</script>';

    await montar().cobrarPendencias();

    const corpo = enviar.mock.calls[0][2] as string;
    expect(corpo).not.toContain("<script>");
    expect(corpo).toContain("&lt;script&gt;");
  });

  it("não envia, e não falha calado, quando a empresa não tem e-mail", async () => {
    empresas = [{ ...empresas[0]!, email: "" }];

    const resultado = await montar().cobrarPendencias();

    expect(enviar).not.toHaveBeenCalled();
    expect(resultado.falhas).toBe(1);
    expect(atualizacoes).toHaveLength(0);
  });
});
