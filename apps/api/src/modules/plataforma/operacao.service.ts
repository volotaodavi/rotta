import { Injectable } from "@nestjs/common";
import { TripStatus, TripStudentEventType } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

export interface OperacaoDaPlataforma {
  medidoEm: string;
  /** Dia operado de hoje, no fuso de Brasília, em `yyyy-mm-dd`. */
  hoje: string;
  viagensHoje: number;
  viagens7d: number;
  viagensFinalizadas7d: number;
  viagensEmAndamento: number;
  /** `yyyy-mm-dd` da última viagem registrada, ou `null` se nunca houve. */
  ultimaViagem: string | null;
  /** Dias inteiros entre hoje e a última viagem. `null` se nunca houve. */
  diasSemViagem: number | null;
  transportadorasComViagem7d: number;
  alunosTransportados7d: number;
  posicoes1h: number;
  errosDeCliente24h: number;
  /** Uma linha em português, pronta para ser lida por uma pessoa. */
  resumo: string;
}

/**
 * Operação da plataforma: a Rotta funcionou?
 *
 * ## Por que existe
 *
 * Em 06/10/2026 o aplicativo ficou inutilizável por uma semana e o
 * fundador descobriu por acidente. O `PulsoService` já media o
 * movimento do minuto, mas ele foi feito para animar o escritório 3D e
 * a própria documentação dele diz, com todas as letras, que a `carga`
 * "não tem significado de negócio e não deve ganhar um". Então não
 * havia nenhum lugar que respondesse a pergunta mais simples da
 * companhia: aconteceu viagem hoje? E na semana?
 *
 * Este serviço responde isso, e só isso. Cada número aqui está definido
 * como conta explícita em `empresa/dados/FORMULAS.md`, seção 1, e nenhum
 * é derivado de outro por estimativa.
 *
 * ## Por que o dia vem do fuso de Brasília, e não de UTC
 *
 * `Trip.data` é o DIA OPERADO (`@db.Date`), não um timestamp: é sobre
 * ele que vale a unicidade "uma viagem em andamento por rota por dia"
 * (`GPS-01`). Uma viagem iniciada às 21h de Brasília já é o dia
 * seguinte em UTC, então contar por UTC jogaria o fim da tarde de toda
 * segunda a sexta para o dia errado. A conversão acontece aqui, uma vez,
 * em vez de ficar espalhada por quem consome.
 *
 * ## O que NÃO sai daqui
 *
 * Nenhum identificador, nenhum nome, nenhuma coordenada. Só contagem e
 * data. Quem precisa saber QUEM viajou usa o Admin, com sessão.
 */
@Injectable()
export class OperacaoService {
  constructor(private readonly prisma: PrismaService) {}

  async medir(): Promise<OperacaoDaPlataforma> {
    const agora = new Date();
    const hoje = OperacaoService.inicioDoDiaEmBrasilia(agora);
    /* Sete dias = hoje mais os seis anteriores, dias inteiros. */
    const seteDias = new Date(hoje.getTime() - 6 * OperacaoService.UM_DIA_MS);
    const umaHora = new Date(agora.getTime() - 60 * 60 * 1000);
    const umDia = new Date(agora.getTime() - OperacaoService.UM_DIA_MS);
    const seteDiasCorridos = new Date(agora.getTime() - 7 * OperacaoService.UM_DIA_MS);

    return this.prisma.runWithTenantContext({ tenantId: null, bypass: true }, async () => {
      const [
        viagensHoje,
        viagens7d,
        viagensFinalizadas7d,
        viagensEmAndamento,
        ultima,
        empresas,
        alunos,
        posicoes1h,
        errosDeCliente24h,
      ] = await Promise.all([
        this.prisma.trip.count({ where: { data: hoje } }),
        this.prisma.trip.count({ where: { data: { gte: seteDias } } }),
        this.prisma.trip.count({
          where: { data: { gte: seteDias }, status: TripStatus.FINALIZADA },
        }),
        this.prisma.trip.count({ where: { status: TripStatus.EM_ANDAMENTO } }),
        this.prisma.trip.findFirst({ orderBy: { data: "desc" }, select: { data: true } }),
        this.prisma.trip.groupBy({ by: ["companyId"], where: { data: { gte: seteDias } } }),
        /*
          Só EMBARCOU. O enum tem EMBARCOU, AUSENTE e DESEMBARCOU:
          contar os três contaria o mesmo aluno duas vezes e contaria
          ausência como transporte.
        */
        this.prisma.tripStudentEvent.groupBy({
          by: ["studentId"],
          where: {
            processadoEm: { gte: seteDiasCorridos },
            tipo: TripStudentEventType.EMBARCOU,
          },
        }),
        this.prisma.tripPosition.count({ where: { capturadaEm: { gte: umaHora } } }),
        this.prisma.clientErrorReport.count({ where: { createdAt: { gte: umDia } } }),
      ]);

      const ultimaViagem = ultima ? OperacaoService.comoDia(ultima.data) : null;
      const diasSemViagem = ultima
        ? Math.round((hoje.getTime() - ultima.data.getTime()) / OperacaoService.UM_DIA_MS)
        : null;

      return {
        medidoEm: agora.toISOString(),
        hoje: OperacaoService.comoDia(hoje),
        viagensHoje,
        viagens7d,
        viagensFinalizadas7d,
        viagensEmAndamento,
        ultimaViagem,
        diasSemViagem,
        transportadorasComViagem7d: empresas.length,
        alunosTransportados7d: alunos.length,
        posicoes1h,
        errosDeCliente24h,
        resumo: OperacaoService.resumir({
          viagensHoje,
          viagens7d,
          diasSemViagem,
          errosDeCliente24h,
        }),
      };
    });
  }

  private static readonly UM_DIA_MS = 24 * 60 * 60 * 1000;

  /**
   * O começo do dia operado de hoje, no fuso de Brasília, como a data
   * que o Prisma usa numa coluna `@db.Date` (meia-noite em UTC).
   *
   * `en-CA` devolve `yyyy-mm-dd`, que é exatamente o formato que o
   * construtor de `Date` interpreta como dia civil.
   */
  private static inicioDoDiaEmBrasilia(agora: Date): Date {
    const dia = agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    return new Date(`${dia}T00:00:00.000Z`);
  }

  private static comoDia(data: Date): string {
    return data.toISOString().slice(0, 10);
  }

  /**
   * A frase que uma pessoa lê sem precisar interpretar número.
   *
   * O silêncio é o caso que mais importa: zero viagem não pode sair como
   * "0", porque zero passa batido. Sai como quantos dias faz, que é o
   * que dá o susto certo.
   */
  private static resumir(d: {
    viagensHoje: number;
    viagens7d: number;
    diasSemViagem: number | null;
    errosDeCliente24h: number;
  }): string {
    const erros =
      d.errosDeCliente24h > 0 ? ` ${d.errosDeCliente24h} erro(s) de cliente em 24h.` : "";

    if (d.diasSemViagem === null) {
      return `Nenhuma viagem foi registrada na Rotta até hoje.${erros}`;
    }
    if (d.viagensHoje > 0) {
      return `${d.viagensHoje} viagem(ns) hoje, ${d.viagens7d} em 7 dias.${erros}`;
    }
    if (d.viagens7d > 0) {
      return `Nenhuma viagem hoje, ${d.viagens7d} em 7 dias. A última foi há ${d.diasSemViagem} dia(s).${erros}`;
    }
    return `Nenhuma viagem há ${d.diasSemViagem} dia(s).${erros}`;
  }
}
