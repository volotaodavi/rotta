import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MapaDaOperacao } from "../components/mapa-da-operacao";

import type { VeiculoNoMapa } from "@rotta/api-client";

/**
 * O mapa da operação do despachante.
 *
 * O que está guardado aqui é a regra que a tela inteira existe para
 * cumprir: **posição velha aparece, mas nunca se chama tempo real**.
 *
 * O defeito que isso previne já aconteceu uma vez no mapa do
 * Responsável e foi corrigido lá. A correção não pode valer só lá: um
 * ônibus que perdeu sinal às 06h20 e continua desenhado no mesmo ponto
 * às 07h faz o despachante NÃO ligar para o motorista, que é
 * exatamente o oposto do que o painel serve para provocar.
 */

// O MapLibre precisa de WebGL, que o jsdom não tem. O mapa em si não é
// o que está sendo testado aqui: o que está é o texto ao redor dele.
vi.mock("@/components/rotta-map-lazy", () => ({
  RottaMapLazy: ({ markers }: { markers: { id: string }[] }) => (
    <div data-testid="mapa">{markers.length} marcadores</div>
  ),
}));

function veiculo(sobrescritas: Partial<VeiculoNoMapa> = {}): VeiculoNoMapa {
  return {
    tripId: "viagem-1",
    veiculoId: "veiculo-1",
    rotaId: "rota-1",
    rotaNome: "Caxito 2",
    turno: "MANHA",
    identificacao: "Ônibus 01.0867",
    placa: "RXT3B21",
    motoristaNome: "Sandro Vieira",
    monitorNome: "Célia Nunes",
    situacao: "EM_MOVIMENTO",
    latitude: -22.9,
    longitude: -42.8,
    velocidadeKmh: 32,
    posicaoCapturadaEm: "2026-10-26T09:59:00.000Z",
    minutosDesdeAPosicao: 1,
    ...sobrescritas,
  };
}

const ATUALIZADO_EM = "2026-10-26T10:00:00.000Z";

describe("o frescor do sinal na tela", () => {
  it("carro sem sinal continua no mapa, com a idade da posição escrita", () => {
    render(
      <MapaDaOperacao
        veiculos={[veiculo({ situacao: "SEM_SINAL", minutosDesdeAPosicao: 45 })]}
        atualizadoEm={ATUALIZADO_EM}
      />,
    );

    // Continua desenhado: saber onde ele estava vale muito.
    expect(screen.getByTestId("mapa")).toHaveTextContent("1 marcadores");
    // E a tela diz, por extenso, que aquilo não é onde ele está.
    expect(screen.getAllByText(/Última posição há 45 min/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sem sinal").length).toBeGreaterThan(0);
  });

  it("carro sem rastreador é descrito como falta de aparelho, não como falta de sinal", () => {
    render(
      <MapaDaOperacao
        veiculos={[
          veiculo({
            situacao: "SEM_RASTREADOR",
            latitude: null,
            longitude: null,
            posicaoCapturadaEm: null,
            minutosDesdeAPosicao: null,
          }),
        ]}
        atualizadoEm={ATUALIZADO_EM}
      />,
    );

    expect(screen.getAllByText("Este carro não tem rastreador vinculado").length).toBeGreaterThan(
      0,
    );
    // Sem coordenada, nada é desenhado: um marcador em (0,0) cairia no
    // golfo da Guiné e seria pior que marcador nenhum.
    expect(screen.queryByTestId("mapa")).not.toBeInTheDocument();
  });

  it("a situação do carro troca junto com os dados, sem a legenda atrapalhar a leitura", () => {
    // A legenda é fixa e sempre lista as quatro situações, então contar
    // ocorrências soltas não diria nada. O que importa é o estado DO
    // CARRO, que vive na lista lateral e na faixa de detalhe: duas
    // ocorrências além da legenda.
    const ocorrenciasFora = (texto: string): number => screen.queryAllByText(texto).length - 1;

    const { rerender } = render(
      <MapaDaOperacao veiculos={[veiculo()]} atualizadoEm={ATUALIZADO_EM} />,
    );
    expect(ocorrenciasFora("Em movimento")).toBe(2);
    expect(ocorrenciasFora("Parado")).toBe(0);

    rerender(
      <MapaDaOperacao
        veiculos={[veiculo({ situacao: "PARADO", velocidadeKmh: 0 })]}
        atualizadoEm={ATUALIZADO_EM}
      />,
    );
    expect(ocorrenciasFora("Parado")).toBe(2);
    expect(ocorrenciasFora("Em movimento")).toBe(0);
  });

  it("monitor ausente é dito por extenso, e não como campo em branco", () => {
    render(
      <MapaDaOperacao veiculos={[veiculo({ monitorNome: null })]} atualizadoEm={ATUALIZADO_EM} />,
    );

    expect(screen.getByText("Nenhum designado para esta viagem")).toBeInTheDocument();
  });

  it("sem nenhuma viagem aberta, a tela explica em vez de ficar vazia", () => {
    render(<MapaDaOperacao veiculos={[]} atualizadoEm={ATUALIZADO_EM} />);

    expect(screen.getByText("Nenhum carro mandando posição agora")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma viagem aberta")).toBeInTheDocument();
  });
});
