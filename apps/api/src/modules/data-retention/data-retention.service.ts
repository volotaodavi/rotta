import { Injectable, Logger } from "@nestjs/common";

import {
  LOTE_DE_EXCLUSAO,
  LOTES_POR_EXECUCAO,
  RETENCAO_POSICOES_DIAS,
} from "./data-retention.constants";

import { PrismaService } from "@/infra/database/prisma.service";

export interface ResultadoDaLimpeza {
  /** Quantas posições foram apagadas nesta execução. */
  apagadas: number;
  /** `true` quando parou por atingir o teto de lotes, não por acabar o trabalho. */
  aindaSobrou: boolean;
  /** Data de corte usada — tudo anterior a ela foi considerado expirado. */
  corte: Date;
}

/**
 * Limpeza do rastro bruto de GPS (ver `data-retention.constants.ts` para
 * a conta que motivou isto e para o que NÃO é apagado).
 *
 * Roda em lotes de propósito. Um `DELETE` sem limite na primeira
 * execução tentaria apagar, numa transação só, tudo acumulado desde que
 * a plataforma existe — travaria a tabela e poderia derrubar a API
 * justamente por causa da limpeza que deveria protegê-la.
 */
@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Apaga posições mais velhas que a janela de retenção.
   *
   * Sem escopo de tenant de propósito: é manutenção de infraestrutura
   * sobre um critério puramente temporal, disparada por job interno e
   * nunca por uma requisição de usuário. Não há ator para escopar, e
   * filtrar por empresa aqui só tornaria a varredura mais cara sem
   * mudar o resultado.
   */
  async limparPosicoesAntigas(): Promise<ResultadoDaLimpeza> {
    const corte = new Date(Date.now() - RETENCAO_POSICOES_DIAS * 24 * 60 * 60 * 1000);

    let apagadas = 0;
    let aindaSobrou = false;

    for (let lote = 0; lote < LOTES_POR_EXECUCAO; lote += 1) {
      // `DELETE ... WHERE id IN (SELECT ... LIMIT n)` porque o Prisma não
      // expõe `LIMIT` em `deleteMany`. O subselect usa o índice
      // `(tripId, capturadaEm)` já existente.
      const resultado = await this.prisma.$executeRaw`
        DELETE FROM "trip_positions"
        WHERE "id" IN (
          SELECT "id" FROM "trip_positions"
          WHERE "capturadaEm" < ${corte}
          LIMIT ${LOTE_DE_EXCLUSAO}
        )
      `;

      apagadas += resultado;

      if (resultado < LOTE_DE_EXCLUSAO) {
        // Lote veio incompleto: acabou o que havia para apagar.
        return { apagadas, aindaSobrou: false, corte };
      }

      aindaSobrou = lote === LOTES_POR_EXECUCAO - 1;
    }

    if (aindaSobrou) {
      this.logger.log(
        `Teto de ${LOTES_POR_EXECUCAO} lotes atingido (${apagadas} posições apagadas). ` +
          "O restante sai nas próximas execuções — esperado enquanto o passivo acumulado drena.",
      );
    }

    return { apagadas, aindaSobrou, corte };
  }
}
