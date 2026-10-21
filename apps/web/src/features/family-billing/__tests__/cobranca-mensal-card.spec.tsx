import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  CobrancaMensalCard,
  FormularioDeCobrancaMensal,
  type LigarCobrancaMensal,
} from "../components/cobranca-mensal-card";

import type { ContratoParaCobrar } from "@rotta/api-client";

/**
 * Ligar a cobrança mensal é operação de dinheiro de uma família de
 * verdade. Três erros aqui não são de layout:
 *
 * 1. **Oferecer ligar de novo numa família que já tem.** Duas
 *    recorrências no mesmo contrato cobram a mesma família duas vezes
 *    por mês, e o estrago aparece no extrato dela.
 * 2. **Mandar CPF incompleto.** O provedor exige o documento de quem
 *    paga, e um CPF de 10 dígitos volta como erro depois de a pessoa já
 *    ter apertado o botão.
 * 3. **Perder a mensagem de recusa.** A recusa quase sempre diz o que
 *    corrigir; num aviso que passa em três segundos, quem está operando
 *    não lê.
 *
 * O formulário é testado direto, e não através do modal: o
 * `Modal.Header` usa ícone de `@rotta/icons`, que o Vitest carrega com
 * a cópia React 18 do pacote e o `react-dom` 19 deste app recusa. É
 * limite do runner, já documentado em `modal-mantem-o-foco.spec.tsx`, e
 * é por isso que a regra mora num componente próprio.
 */

function contrato(overrides: Partial<ContratoParaCobrar> = {}): ContratoParaCobrar {
  return {
    contractId: "contrato-1",
    alunoNome: "Ana",
    responsavelNome: "Marina Alves",
    responsavelTelefone: "21999887766",
    valorCentavos: 66_000,
    valorFormatado: "R$ 660,00",
    statusDoContrato: "ATIVO",
    vigenciaFim: null,
    cobrancaMensalAtiva: false,
    statusDaAssinatura: null,
    precisaDeCpf: false,
    impedimento: null,
    ...overrides,
  };
}

function montarFormulario(
  linha: ContratoParaCobrar,
  onConfirmar: LigarCobrancaMensal = vi.fn<LigarCobrancaMensal>().mockResolvedValue({}),
) {
  render(
    <FormularioDeCobrancaMensal
      contrato={linha}
      isLigando={false}
      onConfirmar={onConfirmar}
      onCancelar={vi.fn()}
    />,
  );
  return { onConfirmar };
}

describe("CobrancaMensalCard: a lista", () => {
  function montarLista(contratos: ContratoParaCobrar[]) {
    render(
      <CobrancaMensalCard
        contratos={contratos}
        isLoading={false}
        isLigando={false}
        onLigarCobranca={vi.fn<LigarCobrancaMensal>().mockResolvedValue({})}
      />,
    );
  }

  it("mostra quem paga, o valor e quantas estao ligadas", () => {
    montarLista([
      contrato(),
      contrato({
        contractId: "c2",
        responsavelNome: "Caio Prado",
        cobrancaMensalAtiva: true,
      }),
    ]);

    expect(screen.getByText("Marina Alves")).toBeInTheDocument();
    expect(screen.getByText("Caio Prado")).toBeInTheDocument();
    expect(screen.getAllByText("R$ 660,00")).toHaveLength(2);
    expect(screen.getByText("1 de 2 ligadas")).toBeInTheDocument();
  });

  /* Quem já tem recorrência não pode receber outra: cobraria em dobro. */
  it("nao oferece ligar em quem ja tem cobranca mensal", () => {
    montarLista([contrato({ cobrancaMensalAtiva: true })]);

    expect(screen.getByText("Ligada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ligar" })).not.toBeInTheDocument();
  });

  /* O impedimento vem da API em uma frase, para a tela não repetir as
     regras do serviço e poder divergir delas. */
  it("mostra o impedimento no lugar do botao", () => {
    montarLista([
      contrato({ impedimento: "A mensalidade está em R$ 0,00: combine o valor com a família." }),
    ]);

    expect(screen.getByText(/R\$ 0,00/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ligar" })).not.toBeInTheDocument();
  });

  it("oferece ligar em quem esta pronto", () => {
    montarLista([contrato()]);

    expect(screen.getByRole("button", { name: "Ligar" })).toBeInTheDocument();
  });
});

describe("FormularioDeCobrancaMensal", () => {
  it("liga a cobranca de quem ja tem CPF, sem pedir documento", async () => {
    const { onConfirmar } = montarFormulario(contrato());

    expect(screen.queryByLabelText(/CPF/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ligar cobrança" }));

    expect(onConfirmar).toHaveBeenCalledWith({
      contractId: "contrato-1",
      input: { meioDePagamento: "PIX" },
    });
  });

  it("pede o CPF quando falta, e manda so os digitos", async () => {
    const { onConfirmar } = montarFormulario(contrato({ precisaDeCpf: true }));

    await userEvent.type(screen.getByLabelText(/CPF/), "123.456.789-09");
    await userEvent.click(screen.getByRole("button", { name: "Ligar cobrança" }));

    expect(onConfirmar).toHaveBeenCalledWith({
      contractId: "contrato-1",
      input: { meioDePagamento: "PIX", cpfDoResponsavel: "12345678909" },
    });
  });

  it("recusa CPF incompleto antes de chamar a API", async () => {
    const { onConfirmar } = montarFormulario(contrato({ precisaDeCpf: true }));

    await userEvent.type(screen.getByLabelText(/CPF/), "1234567");
    await userEvent.click(screen.getByRole("button", { name: "Ligar cobrança" }));

    expect(onConfirmar).not.toHaveBeenCalled();
    expect(screen.getByText(/11 dígitos/)).toBeInTheDocument();
  });

  /* A recusa fica na tela, não num aviso que passa. */
  it("mostra a mensagem de recusa da API no formulario", async () => {
    const recusa = vi
      .fn<LigarCobrancaMensal>()
      .mockRejectedValue(new Error("Este contrato já tem uma cobrança mensal automática."));
    montarFormulario(contrato(), recusa);

    await userEvent.click(screen.getByRole("button", { name: "Ligar cobrança" }));

    expect(screen.getByText(/já tem uma cobrança mensal/)).toBeInTheDocument();
  });

  it("deixa escolher boleto, e a familia decidir", async () => {
    const { onConfirmar } = montarFormulario(contrato());

    await userEvent.selectOptions(screen.getByLabelText(/Como a família paga/), "BOLETO");
    await userEvent.click(screen.getByRole("button", { name: "Ligar cobrança" }));

    expect(onConfirmar).toHaveBeenCalledWith({
      contractId: "contrato-1",
      input: { meioDePagamento: "BOLETO" },
    });
  });

  /* Contrato sem fim de vigência cobra até ser desligado, e isso tem que
     estar escrito antes de a pessoa confirmar. */
  it("diz quando a cobranca para com a vigencia", async () => {
    montarFormulario(contrato({ vigenciaFim: "2026-12-20" }));

    expect(screen.getByText(/para junto com a vigência/)).toBeInTheDocument();
  });

  it("diz quando a cobranca segue indefinidamente", async () => {
    montarFormulario(contrato());

    expect(screen.getByText(/segue até ser desligada/)).toBeInTheDocument();
  });
});
