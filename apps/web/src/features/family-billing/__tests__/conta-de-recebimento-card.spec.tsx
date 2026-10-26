import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContaDeRecebimentoCard } from "../components/conta-de-recebimento-card";

import type {
  CompanyPaymentAccount,
  CriarSubcontaInput,
  DadosParaAbrirConta,
} from "@rotta/api-client";

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
    lytexSubAccountId: "sub_1",
    lytexRecipientId: "rec_1",
    lytexSplitLiberado: true,
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

type AbrirConta = (input: CriarSubcontaInput) => Promise<unknown>;

function montar(props: {
  conta: CompanyPaymentAccount | null;
  dadosParaAbrirConta?: DadosParaAbrirConta;
  onAbrirConta?: AbrirConta;
}) {
  const onAbrirConta = props.onAbrirConta ?? vi.fn<AbrirConta>().mockResolvedValue(conta());
  render(
    <ContaDeRecebimentoCard
      conta={props.conta}
      dadosParaAbrirConta={props.dadosParaAbrirConta}
      onAbrirConta={onAbrirConta}
    />,
  );
  return { onAbrirConta };
}

describe("ContaDeRecebimentoCard", () => {
  it("sem conta aberta, pede um campo e diz onde o dinheiro cai hoje", () => {
    montar({ conta: null });

    expect(screen.getByText("Conta não aberta")).toBeTruthy();
    expect(screen.getByLabelText(/Faturamento mensal/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir conta" })).toBeTruthy();
  });

  /*
    Um formulário de um campo parece incompleto. A pessoa não tem como
    saber que o CNPJ e o endereço dela já estão indo, e não deveria ter
    que confiar: vão escritos, antes de ela confirmar.
  */
  describe("o que a Rotta já sabe vai escrito na tela", () => {
    const dados = {
      razaoSocial: "Transportes Lima LTDA",
      cpfCnpj: "12345678000190",
      email: "contato@lima.com.br",
      telefone: "21999990000",
      endereco: "Avenida Roberto Silveira, 1180, Centro",
      cep: "24900000",
      tipoDePessoa: "JURIDICA" as const,
      faltando: ["Faturamento mensal"],
    };

    it("mostra titular, documento, contato e endereço do cadastro", () => {
      montar({ conta: null, dadosParaAbrirConta: dados });

      expect(screen.getByText("Transportes Lima LTDA")).toBeTruthy();
      expect(screen.getByText("12345678000190")).toBeTruthy();
      expect(screen.getByText("contato@lima.com.br")).toBeTruthy();
      expect(screen.getByText(/Avenida Roberto Silveira, 1180, Centro/)).toBeTruthy();
    });

    it("transportador autônomo tem CPF, e o rótulo acompanha", () => {
      montar({
        conta: null,
        dadosParaAbrirConta: { ...dados, tipoDePessoa: "FISICA", cpfCnpj: "12345678901" },
      });

      expect(screen.getByText("CPF")).toBeTruthy();
      expect(screen.queryByText("CNPJ")).toBeNull();
    });

    it("diz onde corrigir, porque depois de aberta não muda mais por aqui", () => {
      montar({ conta: null, dadosParaAbrirConta: dados });

      expect(screen.getByText(/Corrija no cadastro da transportadora/)).toBeTruthy();
    });

    /* Até o provedor liberar o cadastro inteiro dentro da Rotta, ele
       manda um e-mail próprio. Quem não foi avisado acha que é golpe. */
    it("avisa do e-mail do provedor antes de a pessoa clicar", () => {
      montar({ conta: null, dadosParaAbrirConta: dados });

      expect(screen.getByText(/e-mail do nosso provedor de pagamentos/)).toBeTruthy();
    });

    it("com a conta já criada, o cadastro sai da tela: não há o que conferir", () => {
      montar({ conta: conta(), dadosParaAbrirConta: undefined });

      expect(screen.queryByText("O que vamos usar do cadastro")).toBeNull();
    });
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

  /* A Lytex nao publica endereco de envio de documento na API, e um
     link inventado mandaria a pessoa para uma pagina que nao existe. O
     teste existe para que ninguem "conserte" isso com um palpite. */
  it("nao oferece link de envio de documentos, porque a Lytex nao publica um", () => {
    montar({ conta: conta({ status: "EM_ANALISE" }) });
    expect(screen.queryByText(/Enviar os documentos/)).toBeNull();
  });

  it("sem subconta, a tela convida a abrir em vez de mostrar estado de conta", () => {
    montar({ conta: conta({ lytexSubAccountId: null }) });
    expect(screen.queryByText(/Enviar os documentos/)).toBeNull();
  });
});
