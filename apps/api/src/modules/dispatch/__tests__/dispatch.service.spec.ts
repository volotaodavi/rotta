import { BadRequestException } from "@nestjs/common";

import { DispatchService } from "../dispatch.service";

import type {
  DispatchRepository,
  LinhaDaEscala,
  OcorrenciaDoDia,
  RotaAtiva,
  ViagemDoDia,
} from "../repositories/dispatch.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

import { Role } from "@/shared/enums";

/**
 * Painel Geral do Despachante.
 *
 * O que está guardado aqui é uma coisa só, repetida de ângulos
 * diferentes: **o painel nunca afirma o que não sabe**. Cada teste
 * corresponde a um jeito concreto de a tela mentir, e todos já
 * aconteceram em painel de rastreamento de verdade:
 *
 *  1. Mostrar o ônibus parado onde ele estava quando o sinal caiu, em
 *     vez de dizer que o sinal caiu. É o pior deles: faz o despachante
 *     NÃO ligar para o motorista.
 *  2. Confundir "não sei onde está" com "este carro não tem aparelho".
 *     Um vira telefonema, o outro vira ordem de compra.
 *  3. Inventar horário previsto para rota sem parada fixa, que é o
 *     normal no transporte público escolar, e com isso inventar
 *     atraso.
 *  4. Comparar o relógio de parede da rota com a hora UTC do servidor,
 *     e marcar como atrasada toda rota da manhã de Maricá.
 *  5. Contar a mesma pessoa duas vezes porque ela faz ida e volta.
 */

const empresaActor: AuthenticatedUser = {
  sub: "user-1",
  tenantId: "company-1",
  role: Role.EMPRESA,
  vinculoId: "vinculo-1",
};

const AGORA = new Date("2026-10-26T12:00:00.000Z");

const veiculoComRastreador = {
  id: "veiculo-1",
  numeroFrota: "01.0867",
  placa: "RXT3B21",
  modelo: "VW/Neobus",
  rastreadorImei: "356938035643809",
};

const veiculoSemRastreador = {
  id: "veiculo-2",
  numeroFrota: "01.0412",
  placa: "RJF7C32",
  modelo: "Mercedes/Marcopolo",
  rastreadorImei: null,
};

function viagem(sobrescritas: Partial<ViagemDoDia> = {}): ViagemDoDia {
  return {
    id: "viagem-1",
    codigo: "A1B2C3",
    status: "EM_ANDAMENTO",
    sentido: "IDA",
    iniciadaEm: new Date("2026-10-26T08:52:00.000Z"),
    finalizadaEm: null,
    canceladaEm: null,
    rota: { id: "rota-1", nome: "Caxito 2", turno: "MANHA" },
    veiculo: veiculoComRastreador,
    motorista: { id: "motorista-1", nome: "Sandro Vieira" },
    monitor: { id: "monitor-1", nome: "Célia Nunes" },
    ultimaPosicao: {
      latitude: -22.9,
      longitude: -42.8,
      velocidadeKmh: 32,
      capturadaEm: new Date("2026-10-26T11:59:00.000Z"),
    },
    posicaoAnterior: null,
    ...sobrescritas,
  };
}

function rota(sobrescritas: Partial<RotaAtiva> = {}): RotaAtiva {
  return {
    id: "rota-1",
    nome: "Caxito 2",
    turno: "MANHA",
    status: "ATIVA",
    horarioPrimeiraParada: "06:30",
    horarioUltimaParada: "07:45",
    alunos: 27,
    veiculoPadrao: veiculoComRastreador,
    ...sobrescritas,
  };
}

function criarServico(
  dados: {
    viagens?: ViagemDoDia[];
    rotas?: RotaAtiva[];
    escala?: LinhaDaEscala[];
    ocorrencias?: OcorrenciaDoDia[];
    frota?: { total: number; comRastreador: number };
    equipe?: { motoristas: number; monitores: number };
    fusoHorario?: string;
    minutosParaSemSinal?: number;
  } = {},
) {
  const repository: jest.Mocked<DispatchRepository> = {
    buscarFusoHorario: jest.fn().mockResolvedValue(dados.fusoHorario ?? "America/Sao_Paulo"),
    contarFrota: jest.fn().mockResolvedValue(dados.frota ?? { total: 22, comRastreador: 22 }),
    contarEquipe: jest.fn().mockResolvedValue(dados.equipe ?? { motoristas: 22, monitores: 18 }),
    listarViagensDoDia: jest.fn().mockResolvedValue(dados.viagens ?? []),
    listarRotasAtivas: jest.fn().mockResolvedValue(dados.rotas ?? []),
    listarEscalaDoDia: jest.fn().mockResolvedValue(dados.escala ?? []),
    listarOcorrenciasDesde: jest.fn().mockResolvedValue(dados.ocorrencias ?? []),
    listarEventosDeAlunoDesde: jest.fn().mockResolvedValue([]),
  };

  const config = {
    get: jest.fn().mockReturnValue({
      minutosSemSinalParaEncerrar: dados.minutosParaSemSinal ?? 20,
    }),
  };

  return {
    service: new DispatchService(repository, config as never),
    repository,
  };
}

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(AGORA);
});

afterAll(() => {
  jest.useRealTimers();
});

describe("escopo da empresa", () => {
  it("empresa recebe o painel da própria transportadora, e um companyId na query é ignorado", async () => {
    const { service, repository } = criarServico();

    await service.carregarPainel(empresaActor, "company-de-outra-pessoa");

    expect(repository.listarViagensDoDia).toHaveBeenCalledWith("company-1", expect.any(Date));
  });

  it("admin sem companyId recebe erro em vez de um painel de empresa nenhuma", async () => {
    const { service } = criarServico();

    await expect(
      service.carregarPainel({ ...empresaActor, role: Role.ADMIN_ROTTA, tenantId: undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("o frescor do sinal", () => {
  it("posição recente com velocidade acima do limiar é veículo em movimento", async () => {
    const { service } = criarServico({ viagens: [viagem()] });

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.veiculos[0]?.situacao).toBe("EM_MOVIMENTO");
    expect(painel.veiculos[0]?.minutosDesdeAPosicao).toBe(1);
  });

  it("posição recente com velocidade de GPS tremendo é veículo parado, não em movimento", async () => {
    const { service } = criarServico({
      viagens: [
        viagem({
          ultimaPosicao: {
            latitude: -22.9,
            longitude: -42.8,
            velocidadeKmh: 1.4,
            capturadaEm: new Date("2026-10-26T11:59:00.000Z"),
          },
        }),
      ],
    });

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.veiculos[0]?.situacao).toBe("PARADO");
  });

  it("posição mais velha que o limite vira SEM_SINAL e abre alerta crítico com a idade", async () => {
    const { service } = criarServico({
      viagens: [
        viagem({
          ultimaPosicao: {
            latitude: -22.9,
            longitude: -42.8,
            velocidadeKmh: 48,
            capturadaEm: new Date("2026-10-26T11:15:00.000Z"),
          },
        }),
      ],
    });

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.veiculos[0]?.situacao).toBe("SEM_SINAL");
    // A coordenada CONTINUA na resposta: a tela precisa dela para
    // mostrar onde ele estava. O que não pode é a tela chamar isso de
    // tempo real, e é por isso que `situacao` e `minutosDesdeAPosicao`
    // viajam junto com a coordenada.
    expect(painel.veiculos[0]?.latitude).toBe(-22.9);
    expect(painel.veiculos[0]?.minutosDesdeAPosicao).toBe(45);

    const alerta = painel.alertas.find((item) => item.id === "sem-sinal:viagem-1");
    expect(alerta?.nivel).toBe("CRITICO");
    expect(alerta?.descricao).toContain("45 min");
  });

  it("viagem aberta num carro sem rastreador é SEM_RASTREADOR, que é outro problema", async () => {
    const { service } = criarServico({
      viagens: [viagem({ veiculo: veiculoSemRastreador, ultimaPosicao: null })],
    });

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.veiculos[0]?.situacao).toBe("SEM_RASTREADOR");
    expect(painel.alertas[0]?.titulo).toBe("Ônibus 01.0412 sem rastreador");
  });

  it("sem velocidade informada, o movimento sai do deslocamento entre as duas últimas posições", async () => {
    const semVelocidade = {
      latitude: -22.9,
      longitude: -42.8,
      velocidadeKmh: null,
      capturadaEm: new Date("2026-10-26T11:59:00.000Z"),
    };

    const parado = criarServico({
      viagens: [
        viagem({
          ultimaPosicao: semVelocidade,
          // Dez metros ao norte: dentro do erro de um GPS urbano.
          posicaoAnterior: { ...semVelocidade, latitude: -22.90009 },
        }),
      ],
    });
    const andando = criarServico({
      viagens: [
        viagem({
          ultimaPosicao: semVelocidade,
          // Perto de 300 metros: o carro saiu do lugar.
          posicaoAnterior: { ...semVelocidade, latitude: -22.9027 },
        }),
      ],
    });

    expect((await parado.service.carregarPainel(empresaActor)).veiculos[0]?.situacao).toBe(
      "PARADO",
    );
    expect((await andando.service.carregarPainel(empresaActor)).veiculos[0]?.situacao).toBe(
      "EM_MOVIMENTO",
    );
  });
});

describe("as rotas do dia", () => {
  it("rota sem parada cadastrada fica sem janela de horário e sem atraso", async () => {
    // O caso normal do transporte público escolar: cada rota tem a sua
    // dinâmica e quase não há ponto fixo. Inventar um horário aqui
    // inventaria também um atraso, e o despachante correria atrás de um
    // problema que não existe.
    const { service } = criarServico({
      rotas: [rota({ horarioPrimeiraParada: null, horarioUltimaParada: null })],
    });

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.rotasDoDia[0]?.horarioPrevistoInicio).toBeNull();
    expect(painel.rotasDoDia[0]?.minutosDeAtraso).toBeNull();
    expect(painel.rotasDoDia[0]?.situacao).toBe("NAO_INICIADA");
    expect(painel.alertas).toHaveLength(0);
  });

  it("o atraso é medido no fuso da empresa, não na hora UTC do servidor", async () => {
    // 12:00 UTC é 09:00 em Brasília. Uma rota prevista para 06:30 que
    // não saiu está 150 minutos atrasada, não 330.
    const { service } = criarServico({ rotas: [rota()] });

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.rotasDoDia[0]?.situacao).toBe("ATRASADA");
    expect(painel.rotasDoDia[0]?.minutosDeAtraso).toBe(150);
  });

  it("rota com viagem rodando nunca é atrasada, mesmo depois do horário previsto", async () => {
    const { service } = criarServico({ rotas: [rota()], viagens: [viagem()] });

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.rotasDoDia[0]?.situacao).toBe("EM_ANDAMENTO");
    expect(painel.rotasDoDia[0]?.minutosDeAtraso).toBeNull();
  });

  it("rota que já voltou é CONCLUIDA, e não se confunde com rota que não saiu", async () => {
    const { service } = criarServico({
      rotas: [rota()],
      viagens: [
        viagem({
          status: "FINALIZADA",
          finalizadaEm: new Date("2026-10-26T10:45:00.000Z"),
        }),
      ],
    });

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.rotasDoDia[0]?.situacao).toBe("CONCLUIDA");
  });

  it("o carro mostrado é o da viagem de hoje, não o padrão da rota", async () => {
    // A mesma precedência que o rastreador usa para decidir qual
    // viagem abrir. Mostrar o padrão enquanto o motorista dirige outro
    // carro faria o painel discordar da rua.
    const { service } = criarServico({
      rotas: [rota({ veiculoPadrao: veiculoComRastreador })],
      viagens: [viagem({ veiculo: veiculoSemRastreador })],
    });

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.rotasDoDia[0]?.veiculoIdentificacao).toBe("Ônibus 01.0412");
  });

  it("sem viagem, o carro vem da escala do dia antes de vir do padrão da rota", async () => {
    const { service } = criarServico({
      rotas: [rota({ veiculoPadrao: veiculoComRastreador })],
      escala: [
        {
          routeId: "rota-1",
          rotaNome: "Caxito 2",
          turno: "MANHA",
          veiculo: veiculoSemRastreador,
          motoristaNome: "João Pereira",
          monitorNome: null,
          observacao: null,
        },
      ],
    });

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.rotasDoDia[0]?.veiculoIdentificacao).toBe("Ônibus 01.0412");
    expect(painel.rotasDoDia[0]?.motoristaNome).toBe("João Pereira");
  });
});

describe("os indicadores", () => {
  it("a mesma pessoa em duas viagens do dia conta uma vez", async () => {
    const { service } = criarServico({
      viagens: [
        viagem({ id: "viagem-ida" }),
        viagem({ id: "viagem-volta", sentido: "VOLTA", codigo: "D4E5F6" }),
      ],
    });

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.indicadores.motoristasEmAtividade.atual).toBe(1);
    expect(painel.indicadores.monitoresEmAtividade.atual).toBe(1);
  });

  it("ocorrências não têm denominador inventado", async () => {
    const { service } = criarServico();

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.indicadores.ocorrenciasHoje.total).toBeNull();
  });

  it("carros sem rastreador aparecem como número próprio", async () => {
    const { service } = criarServico({ frota: { total: 22, comRastreador: 3 } });

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.indicadores.veiculosSemRastreador).toBe(19);
  });
});

describe("os alertas", () => {
  it("viagem rodando sem monitor designado vira alerta de atenção", async () => {
    const { service } = criarServico({ viagens: [viagem({ monitor: null })] });

    const painel = await service.carregarPainel(empresaActor);

    const alerta = painel.alertas.find((item) => item.id === "sem-monitor:viagem-1");
    expect(alerta?.nivel).toBe("ATENCAO");
    expect(alerta?.titulo).toBe("Caxito 2 sem monitor");
  });

  it("o alerta mais grave fica no topo sem o despachante procurar", async () => {
    const { service } = criarServico({
      viagens: [
        viagem({ monitor: null }),
        viagem({
          id: "viagem-muda",
          codigo: "G7H8I9",
          rota: { id: "rota-2", nome: "Silvado 84", turno: "MANHA" },
          ultimaPosicao: {
            latitude: -22.9,
            longitude: -42.8,
            velocidadeKmh: 0,
            capturadaEm: new Date("2026-10-26T10:00:00.000Z"),
          },
        }),
      ],
    });

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.alertas[0]?.nivel).toBe("CRITICO");
    expect(painel.alertas[0]?.id).toBe("sem-sinal:viagem-muda");
  });
});

describe("os eventos recentes", () => {
  it("a linha do tempo sai do que aconteceu, em ordem decrescente", async () => {
    const { service } = criarServico({
      viagens: [
        viagem({
          status: "FINALIZADA",
          iniciadaEm: new Date("2026-10-26T08:52:00.000Z"),
          finalizadaEm: new Date("2026-10-26T10:45:00.000Z"),
        }),
      ],
    });

    const painel = await service.carregarPainel(empresaActor);

    expect(painel.eventosRecentes.map((evento) => evento.titulo)).toEqual([
      "Viagem encerrada",
      "Viagem aberta",
    ]);
  });
});
