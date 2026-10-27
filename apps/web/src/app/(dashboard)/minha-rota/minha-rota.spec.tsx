import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MinhaRotaPage from "./page";

import type { Route } from "@rotta/api-client";

/**
 * A tela do motorista e do monitor.
 *
 * ## Por que esta tela ganha teste antes das outras
 *
 * É por ela que a viagem começa, pausa e termina, com criança dentro do
 * carro, e até hoje ela não tinha nenhuma rede. O que está guardado
 * aqui são os três estados em que a pessoa pode cair ao abrir o app de
 * manhã, e o pior deles não é o erro: é a tela vazia sem explicação,
 * que faz o motorista achar que o sistema quebrou quando na verdade
 * ninguém o vinculou a uma rota.
 *
 * O caminho de operação de verdade (`RotaOperacional`, com viagem,
 * paradas e GPS) é deliberadamente trocado por um marcador aqui: ele
 * depende de uma dúzia de hooks e do MapLibre, e tentar montá-lo neste
 * nível testaria a mocagem, não a tela. O que este arquivo garante é
 * que a página escolhe o estado certo, incluindo entrar na operação
 * quando deve.
 */

const useMinhasRotas = vi.fn();
const useAuth = vi.fn();

vi.mock("@rotta/auth/web", () => ({ useAuth: () => useAuth() }));
vi.mock("@/features/driver/hooks/use-driver-routes", () => ({
  useMinhasRotas: () => useMinhasRotas(),
}));
vi.mock("@/hooks/use-my-location", () => ({
  useMyLocation: () => ({ location: null, status: "idle" }),
}));
vi.mock("@/features/minha-rota/components/meu-mapa", () => ({
  MeuMapa: () => <div data-testid="mapa" />,
}));
vi.mock("@/features/minha-rota/components/rota-operacional", () => ({
  RotaOperacional: ({ rota }: { rota: { nome: string } }) => (
    <div data-testid="operacao">{rota.nome}</div>
  ),
}));

function rota(sobrescritas: Partial<Route> = {}): Route {
  return {
    id: "rota-1",
    nome: "Caxito 2",
    turno: "MANHA",
    status: "ATIVA",
    diasSemana: [],
    companyId: "empresa-1",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...sobrescritas,
  } as Route;
}

beforeEach(() => {
  useAuth.mockReturnValue({ user: { nome: "Sandro Vieira" } });
  useMinhasRotas.mockReturnValue({ data: { items: [] }, isLoading: false });
});

describe("enquanto carrega", () => {
  it("mostra que está carregando, em vez de dizer que não há rota", () => {
    // O pior estado possível desta tela: afirmar "nenhuma rota
    // atribuída" enquanto a resposta ainda está a caminho faria o
    // motorista ligar para o suporte sem motivo.
    useMinhasRotas.mockReturnValue({ data: undefined, isLoading: true });

    render(<MinhaRotaPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma rota atribuída")).not.toBeInTheDocument();
  });
});

describe("sem rota atribuída", () => {
  it("explica o que aconteceu e diz com quem falar", () => {
    useMinhasRotas.mockReturnValue({ data: { items: [] }, isLoading: false });

    render(<MinhaRotaPage />);

    expect(screen.getByText("Nenhuma rota atribuída")).toBeInTheDocument();
    expect(screen.getByText(/Fale com o suporte Rotta/)).toBeInTheDocument();
  });

  it("mostra o mapa mesmo assim", () => {
    // Pedido antigo e explícito: o mapa aparece em TODO estado da tela,
    // inclusive sem rota, com a posição do próprio telefone.
    useMinhasRotas.mockReturnValue({ data: { items: [] }, isLoading: false });

    render(<MinhaRotaPage />);

    expect(screen.getByTestId("mapa")).toBeInTheDocument();
  });
});

describe("com mais de uma rota", () => {
  it("deixa escolher, sem entrar em nenhuma sozinha", () => {
    useMinhasRotas.mockReturnValue({
      data: { items: [rota(), rota({ id: "rota-2", nome: "Silvado 84", turno: "TARDE" })] },
      isLoading: false,
    });

    render(<MinhaRotaPage />);

    expect(screen.getByText("Suas rotas")).toBeInTheDocument();
    expect(screen.getByText("Caxito 2")).toBeInTheDocument();
    expect(screen.getByText("Silvado 84")).toBeInTheDocument();
    expect(screen.queryByTestId("operacao")).not.toBeInTheDocument();
  });

  it("escreve o turno por extenso, não o código do banco", () => {
    useMinhasRotas.mockReturnValue({
      data: { items: [rota(), rota({ id: "rota-2", nome: "Silvado 84", turno: "TARDE" })] },
      isLoading: false,
    });

    render(<MinhaRotaPage />);

    expect(screen.getByText("Manhã")).toBeInTheDocument();
    expect(screen.getByText("Tarde")).toBeInTheDocument();
    expect(screen.queryByText("MANHA")).not.toBeInTheDocument();
  });
});

describe("com uma rota só", () => {
  it("cai direto na operação, sem pedir escolha entre uma opção", () => {
    useMinhasRotas.mockReturnValue({ data: { items: [rota()] }, isLoading: false });

    render(<MinhaRotaPage />);

    expect(screen.getByTestId("operacao")).toHaveTextContent("Caxito 2");
    expect(screen.queryByText("Suas rotas")).not.toBeInTheDocument();
  });
});
