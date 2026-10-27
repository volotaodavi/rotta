import { ToastProvider } from "@rotta/ui/web";
import { render as renderCru, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MensalidadesPage from "./page";

/**
 * A tela de mensalidades da transportadora.
 *
 * É a tela de dinheiro: o que as famílias devem. Os dois jeitos de ela
 * mentir são opostos e igualmente caros.
 *
 * 1. **Dizer que não há fatura enquanto a resposta vem.** O
 *    transportador conclui que a cobrança do mês não foi emitida e liga
 *    para o suporte, ou pior, emite de novo por fora.
 * 2. **Mostrar um traço no lugar de "ainda não pago".** Em tela de
 *    dinheiro, campo vazio e zero não são a mesma coisa.
 */

const useFaturasDaEmpresa = vi.fn();

vi.mock("@/features/family-billing/hooks/use-family-billing", () => ({
  useFaturasDaEmpresa: (...args: unknown[]) => useFaturasDaEmpresa(...args),
  useContaDeRecebimento: () => ({ data: undefined, isLoading: false }),
  useSalvarContaDeRecebimento: () => ({ mutate: vi.fn(), isPending: false }),
  useCriarSubconta: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useContratosParaCobrar: () => ({ data: undefined, isLoading: false }),
  useCriarAssinaturaDoContrato: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/features/family-billing/components/conta-de-recebimento-card", () => ({
  ContaDeRecebimentoCard: () => <div data-testid="conta" />,
}));
vi.mock("@/features/family-billing/components/cobranca-mensal-card", () => ({
  CobrancaMensalCard: () => <div data-testid="cobranca" />,
}));

function fatura(sobrescritas: Record<string, unknown> = {}) {
  return {
    id: "fatura-1",
    studentNome: "Maria Laura",
    competenciaRotulo: "Outubro/2026",
    vencimento: "2026-10-10",
    valorFormatado: "R$ 390,00",
    status: "A_VENCER",
    pagoEm: null,
    ...sobrescritas,
  };
}

/**
 * A página chama `useToast`, que exige o provedor. Em produção ele vem
 * de `AppProviders`; aqui entra só ele, para o teste continuar sendo
 * sobre a tela e não sobre a árvore de provedores inteira.
 */
function render(no: React.ReactElement) {
  return renderCru(<ToastProvider>{no}</ToastProvider>);
}

beforeEach(() => {
  useFaturasDaEmpresa.mockReturnValue({ data: { items: [] }, isLoading: false });
});

describe("enquanto carrega", () => {
  it("diz que está carregando, e não que não existe fatura", () => {
    useFaturasDaEmpresa.mockReturnValue({ data: undefined, isLoading: true });

    render(<MensalidadesPage />);

    expect(screen.getByText("Carregando…")).toBeInTheDocument();
    expect(screen.queryByText(/Nenhuma mensalidade emitida/)).not.toBeInTheDocument();
  });
});

describe("sem nenhuma fatura", () => {
  it("explica por que a lista está vazia, em vez de só ficar vazia", () => {
    useFaturasDaEmpresa.mockReturnValue({ data: { items: [] }, isLoading: false });

    render(<MensalidadesPage />);

    expect(screen.getByText(/Nenhuma mensalidade emitida ainda/)).toBeInTheDocument();
    expect(screen.getByText(/geradas no começo de cada mês/)).toBeInTheDocument();
  });
});

describe("com faturas", () => {
  it("mostra aluno, competência e valor já formatados pelo servidor", () => {
    useFaturasDaEmpresa.mockReturnValue({ data: { items: [fatura()] }, isLoading: false });

    render(<MensalidadesPage />);

    expect(screen.getByText("Maria Laura")).toBeInTheDocument();
    expect(screen.getByText("Outubro/2026")).toBeInTheDocument();
    expect(screen.getByText("R$ 390,00")).toBeInTheDocument();
  });

  it("filtrar por situação chega até a consulta, não só ao visual do botão", () => {
    // Um filtro que muda só a cor do botão e não a consulta é o defeito
    // mais fácil de não perceber numa tela de lista.
    useFaturasDaEmpresa.mockReturnValue({ data: { items: [fatura()] }, isLoading: false });

    render(<MensalidadesPage />);
    const chamadasAntes = useFaturasDaEmpresa.mock.calls.length;

    return userEvent.click(screen.getByRole("button", { name: /pagas/i })).then(() => {
      const ultima = useFaturasDaEmpresa.mock.calls.at(-1)?.[0];
      expect(useFaturasDaEmpresa.mock.calls.length).toBeGreaterThan(chamadasAntes);
      expect(ultima).toMatchObject({ status: expect.any(String) });
    });
  });
});
