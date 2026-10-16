import { TripStatus, TripStudentEventType } from "@prisma/client";

import { OperacaoService } from "../operacao.service";

import type { PrismaService } from "@/infra/database/prisma.service";

/**
 * O painel que responde "a Rotta funcionou?".
 *
 * Existe porque em 06/10/2026 o aplicativo ficou inutilizável por uma
 * semana e o fundador descobriu por acidente. O que estes testes
 * prendem não é a aritmética fácil de contar linha, é o que erra em
 * silêncio: o fuso do dia operado, o tipo de evento de aluno, e o
 * silêncio do zero.
 */

interface Chamadas {
  tripCount: jest.Mock;
  tripFindFirst: jest.Mock;
  tripGroupBy: jest.Mock;
  eventoGroupBy: jest.Mock;
  posicaoCount: jest.Mock;
  erroCount: jest.Mock;
}

function montarPrisma(
  overrides: Partial<{
    viagens: number;
    ultimaViagem: Date | null;
    empresas: number;
    alunos: number;
    posicoes: number;
    erros: number;
  }> = {},
): { prisma: PrismaService; chamadas: Chamadas } {
  const chamadas: Chamadas = {
    tripCount: jest.fn().mockResolvedValue(overrides.viagens ?? 0),
    tripFindFirst: jest
      .fn()
      .mockResolvedValue(
        overrides.ultimaViagem === undefined
          ? { data: new Date("2026-08-28T00:00:00.000Z") }
          : overrides.ultimaViagem === null
            ? null
            : { data: overrides.ultimaViagem },
      ),
    tripGroupBy: jest.fn().mockResolvedValue(new Array(overrides.empresas ?? 0).fill({})),
    eventoGroupBy: jest.fn().mockResolvedValue(new Array(overrides.alunos ?? 0).fill({})),
    posicaoCount: jest.fn().mockResolvedValue(overrides.posicoes ?? 0),
    erroCount: jest.fn().mockResolvedValue(overrides.erros ?? 0),
  };

  const prisma = {
    /* O serviço precisa atravessar o isolamento por companyId: é contagem
       da plataforma inteira. O teste só repassa a função. */
    runWithTenantContext: <T>(_ctx: unknown, fn: () => Promise<T>): Promise<T> => fn(),
    trip: {
      count: chamadas.tripCount,
      findFirst: chamadas.tripFindFirst,
      groupBy: chamadas.tripGroupBy,
    },
    tripStudentEvent: { groupBy: chamadas.eventoGroupBy },
    tripPosition: { count: chamadas.posicaoCount },
    clientErrorReport: { count: chamadas.erroCount },
  } as unknown as PrismaService;

  return { prisma, chamadas };
}

describe("OperacaoService", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("conta o dia operado no fuso de Brasília, não em UTC", async () => {
    /*
      23h30 de 15/10 em Brasília já é 02h30 de 16/10 em UTC. Uma viagem
      da volta da tarde cai exatamente nessa faixa, e contar por UTC
      jogaria o fim de todo dia útil para o dia seguinte. `Trip.data` é
      o DIA OPERADO (@db.Date), não um timestamp.
    */
    jest.useFakeTimers().setSystemTime(new Date("2026-10-16T02:30:00.000Z"));
    const { prisma, chamadas } = montarPrisma();

    const r = await new OperacaoService(prisma).medir();

    expect(r.hoje).toBe("2026-10-15");
    /* A primeira chamada de count é a de hoje. */
    expect(chamadas.tripCount.mock.calls[0]![0]).toEqual({
      where: { data: new Date("2026-10-15T00:00:00.000Z") },
    });
  });

  it("a janela de 7 dias é hoje mais os seis anteriores", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-16T12:00:00.000Z"));
    const { prisma, chamadas } = montarPrisma();

    await new OperacaoService(prisma).medir();

    /* Segunda chamada: viagens dos 7 dias. */
    expect(chamadas.tripCount.mock.calls[1]![0]).toEqual({
      where: { data: { gte: new Date("2026-10-10T00:00:00.000Z") } },
    });
    expect(chamadas.tripCount.mock.calls[2]![0]).toEqual({
      where: {
        data: { gte: new Date("2026-10-10T00:00:00.000Z") },
        status: TripStatus.FINALIZADA,
      },
    });
  });

  it("conta aluno transportado só por EMBARCOU", async () => {
    /*
      O enum tem EMBARCOU, AUSENTE e DESEMBARCOU. Contar os três
      contaria o mesmo aluno duas vezes e contaria ausência como
      transporte, o que inflaria justamente a métrica que mede se o
      produto está sendo usado.
    */
    jest.useFakeTimers().setSystemTime(new Date("2026-10-16T12:00:00.000Z"));
    const { prisma, chamadas } = montarPrisma({ alunos: 3 });

    const r = await new OperacaoService(prisma).medir();

    expect(r.alunosTransportados7d).toBe(3);
    const argumentos = chamadas.eventoGroupBy.mock.calls[0]![0] as {
      by: string[];
      where: { tipo: TripStudentEventType };
    };
    expect(argumentos.by).toEqual(["studentId"]);
    expect(argumentos.where.tipo).toBe(TripStudentEventType.EMBARCOU);
  });

  it("diz há quantos dias não há viagem, em vez de mostrar zero", async () => {
    /*
      Zero passa batido. O número que dá o susto certo é o de dias, e é
      por isso que o resumo existe: um painel que mostra "0" é lido como
      "nada de novo", e o que estava acontecendo era o produto parado
      havia sete semanas.
    */
    jest.useFakeTimers().setSystemTime(new Date("2026-10-16T12:00:00.000Z"));
    const { prisma } = montarPrisma({
      viagens: 0,
      ultimaViagem: new Date("2026-08-28T00:00:00.000Z"),
      erros: 2,
    });

    const r = await new OperacaoService(prisma).medir();

    expect(r.ultimaViagem).toBe("2026-08-28");
    expect(r.diasSemViagem).toBe(49);
    expect(r.resumo).toBe("Nenhuma viagem há 49 dia(s). 2 erro(s) de cliente em 24h.");
  });

  it("não inventa dias quando nunca houve viagem", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-16T12:00:00.000Z"));
    const { prisma } = montarPrisma({ ultimaViagem: null });

    const r = await new OperacaoService(prisma).medir();

    expect(r.ultimaViagem).toBeNull();
    expect(r.diasSemViagem).toBeNull();
    expect(r.resumo).toBe("Nenhuma viagem foi registrada na Rotta até hoje.");
  });

  it("quando há viagem hoje, o resumo abre pelo número de hoje", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-16T12:00:00.000Z"));
    const { prisma } = montarPrisma({
      viagens: 4,
      ultimaViagem: new Date("2026-10-16T00:00:00.000Z"),
      empresas: 2,
    });

    const r = await new OperacaoService(prisma).medir();

    expect(r.viagensHoje).toBe(4);
    expect(r.transportadorasComViagem7d).toBe(2);
    expect(r.resumo).toBe("4 viagem(ns) hoje, 4 em 7 dias.");
  });
});
