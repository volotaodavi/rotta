import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContaDeRecebimentoCard } from "../components/conta-de-recebimento-card";

import type { CompanyPaymentAccount, CriarSubcontaAsaasInput } from "@rotta/api-client";

/**
 * A conta de recebimento é o que decide por onde passa o dinheiro da
 * família. Dois erros aqui não são de layout:
 *
 * 1. **Oferecer abrir a segunda conta.** A chave de acesso da subconta
 *    só aparece na resposta da criação e não há como pedir de novo:
 *    abrir a segunda deixaria a primeira inacessível, possivelmente já
 *    com saldo, sem desfazer. A API recusa, e a tela não pode nem
 *    oferecer.
 * 2. **Mandar centavos errados.** O faturamento é digitado em notação
 *    brasileira e vai em centavos. Ler "4.500,00" como 450 centavos
 *    informaria ao provedor um faturamento mil vezes menor.
 */

function conta(overrides: Partial<CompanyPaymentAccount> = {}): CompanyPaymentAccount {
  return {
    id: "conta-1",
    companyId: "company-1",
    status: "EM_ANALISE",
    asaasWalletId: "wallet_1",
    asaasAccountId: "acc_1",
    asaasOnboardingUrl: null,
    podeEmitirPelaSubconta: true,
    chavePix: null,
    emissorDaCobranca: "ROTTA",
    custodiaAtiva: false,
    custodiaDiasParaLiberar: null,
    taxaDaPlataformaBps: 0,
    taxaPixBps: 129,
    taxaBoletoBps: 129,
    taxaCreditoVistaBps: 99,
    taxaCreditoParceladoBps: 49,
    observacoes: null,
    ...overrides,
  };
}

type AbrirConta = (input: CriarSubcontaAsaasInput) => Promise<unknown>;

function montar(props: { conta: CompanyPaymentAccount | null; onAbrirConta?: AbrirConta }) {
  const onAbrirConta = props.onAbrirConta ?? vi.fn<AbrirConta>().mockResolvedValue(conta());
  render(<ContaDeRecebimentoCard conta={props.conta} onAbrirConta={onAbrirConta} />);
  return { onAbrirConta };
}

describe("ContaDeRecebimentoCard", () => {
  it("sem conta aberta, pede um campo e diz onde o dinheiro cai hoje", () => {
    montar({ conta: null });

    expect(screen.getByText("Conta não aberta")).toBeTruthy();
    expect(screen.getByLabelText(/Faturamento mensal/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir conta" })).toBeTruthy();
  });

  /* Em branco, os contatos ficam de fora: valem os do cadastro da
     transportadora, resolvidos no servidor. */
  it("manda o faturamento em centavos, lido da notação brasileira", async () => {
    const { onAbrirConta } = montar({ conta: null });

    await userEvent.type(screen.getByLabelText(/Faturamento mensal/), "4.500,00");
    await userEvent.click(screen.getByRole("button", { name: "Abrir conta" }));

    expect(onAbrirConta).toHaveBeenCalledWith({
      faturamentoMensalCentavos: 450_000,
      email: undefined,
      telefone: undefined,
    });
  });

  it("o telefone do financeiro vai só com dígitos, sem a máscara", async () => {
    const { onAbrirConta } = montar({ conta: null });

    await userEvent.type(screen.getByLabelText(/Faturamento mensal/), "4.500,00");
    await userEvent.type(screen.getByLabelText(/Celular do financeiro/), "(21) 99999-8888");
    await userEvent.click(screen.getByRole("button", { name: "Abrir conta" }));

    expect(onAbrirConta).toHaveBeenCalledWith(expect.objectContaining({ telefone: "21999998888" }));
  });

  it("sem valor legível, não chama a API e o erro fica no campo", async () => {
    const { onAbrirConta } = montar({ conta: null });

    await userEvent.type(screen.getByLabelText(/Faturamento mensal/), "abc");
    await userEvent.click(screen.getByRole("button", { name: "Abrir conta" }));

    expect(onAbrirConta).not.toHaveBeenCalled();
    expect(screen.getByText(/Informe o faturamento mensal/)).toBeTruthy();
  });

  it("com conta em análise, não oferece abrir de novo", () => {
    montar({ conta: conta() });

    expect(screen.getByText("Em análise")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Abrir conta" })).toBeNull();
    expect(screen.queryByLabelText(/Faturamento mensal/)).toBeNull();
  });

  it("com conta ativa, diz que o pagamento vai direto e não pede nada", () => {
    montar({ conta: conta({ status: "ATIVA" }) });

    expect(screen.getByText("Recebendo direto")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Abrir conta" })).toBeNull();
  });

  it("recusada diz o que fazer, em vez de só dizer que não deu", () => {
    montar({ conta: conta({ status: "RECUSADA" }) });

    expect(screen.getByText("Recusada")).toBeTruthy();
    expect(screen.getByText(/suporte/)).toBeTruthy();
  });

  /* Link inventado manda a pessoa para uma página que não existe. */
  it("o link de documentos só aparece quando o provedor manda um", () => {
    montar({ conta: conta({ asaasOnboardingUrl: null }) });
    expect(screen.queryByText("Enviar os documentos da conta")).toBeNull();
  });

  it("e aparece quando ele vem", () => {
    montar({ conta: conta({ asaasOnboardingUrl: "https://exemplo.invalid/onboarding" }) });

    const link = screen.getByText("Enviar os documentos da conta");
    expect(link.getAttribute("href")).toBe("https://exemplo.invalid/onboarding");
  });
});
