import { Test } from "@nestjs/testing";

import {
  LOTE_DE_EXCLUSAO,
  LOTES_POR_EXECUCAO,
  RETENCAO_POSICOES_DIAS,
} from "../data-retention.constants";
import { DataRetentionService } from "../data-retention.service";

import { PrismaService } from "@/infra/database/prisma.service";

/**
 * O que estes testes protegem:
 *
 *  1. Que a limpeza roda EM LOTES. Um `DELETE` sem limite na primeira
 *     execução tentaria apagar tudo acumulado desde sempre numa
 *     transação só — travaria a tabela e poderia derrubar a API por
 *     causa da limpeza que deveria protegê-la.
 *  2. Que ela PARA quando acaba o trabalho, em vez de rodar os 10 lotes
 *     à toa todo dia.
 *  3. Que a janela de retenção é longa o bastante para o uso real.
 */
describe("DataRetentionService", () => {
  let service: DataRetentionService;
  let executeRaw: jest.Mock;

  beforeEach(async () => {
    executeRaw = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [
        DataRetentionService,
        { provide: PrismaService, useValue: { $executeRaw: executeRaw } },
      ],
    }).compile();

    service = moduleRef.get(DataRetentionService);
  });

  it("para no primeiro lote incompleto — não gasta as 10 rodadas à toa", async () => {
    executeRaw.mockResolvedValueOnce(120);

    const resultado = await service.limparPosicoesAntigas();

    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(resultado.apagadas).toBe(120);
    expect(resultado.aindaSobrou).toBe(false);
  });

  it("não faz nenhuma rodada extra quando não há nada para apagar", async () => {
    executeRaw.mockResolvedValueOnce(0);

    const resultado = await service.limparPosicoesAntigas();

    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(resultado.apagadas).toBe(0);
  });

  it("encadeia lotes enquanto vierem cheios, respeitando o teto", async () => {
    // Todo lote cheio: é o cenário da primeira execução, com anos de
    // passivo acumulado.
    executeRaw.mockResolvedValue(LOTE_DE_EXCLUSAO);

    const resultado = await service.limparPosicoesAntigas();

    expect(executeRaw).toHaveBeenCalledTimes(LOTES_POR_EXECUCAO);
    expect(resultado.apagadas).toBe(LOTE_DE_EXCLUSAO * LOTES_POR_EXECUCAO);
    // Sinaliza que sobrou trabalho — a próxima execução continua.
    expect(resultado.aindaSobrou).toBe(true);
  });

  it("corta pela janela de retenção, não por uma data qualquer", async () => {
    executeRaw.mockResolvedValueOnce(0);
    const antes = Date.now();

    const { corte } = await service.limparPosicoesAntigas();

    const idadeDoCorteMs = antes - corte.getTime();
    const esperadoMs = RETENCAO_POSICOES_DIAS * 24 * 60 * 60 * 1000;
    // Tolerância de 1s para o tempo gasto dentro do próprio teste.
    expect(Math.abs(idadeDoCorteMs - esperadoMs)).toBeLessThan(1_000);
  });
});

describe("janela de retenção", () => {
  it("cobre com folga o uso operacional real", () => {
    // Conferir o trajeto de ontem, investigar reclamação da semana
    // passada, revisar o mês fechado — tudo cabe em 90 dias. Menos que
    // um mês começaria a apagar coisa que ainda se consulta.
    expect(RETENCAO_POSICOES_DIAS).toBeGreaterThanOrEqual(60);
  });
});
