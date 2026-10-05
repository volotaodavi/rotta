import { Injectable } from "@nestjs/common";
import { TripStatus } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

export interface PulsoDaPlataforma {
  medidoEm: string;
  /** Viagens acontecendo neste exato momento. */
  viagensEmAndamento: number;
  /** Posições de veículo recebidas na última hora. É o sinal mais vivo que existe. */
  posicoesNaUltimaHora: number;
  /** Embarques e desembarques registrados nas últimas 24 horas. */
  eventosDeAluno24h: number;
  /** Contas criadas nas últimas 24 horas. */
  contasNovas24h: number;
  /** Erros que chegaram da mão do usuário nas últimas 24 horas. */
  errosDeCliente24h: number;
  /**
   * De 0 a 1, o quanto a plataforma está em movimento agora.
   *
   * É o número que faz os agentes da sala de IA acelerarem na tela do
   * escritório. Não tem significado de negócio e não deve ganhar um:
   * serve para uma pessoa olhar e saber se a Rotta está sendo usada
   * neste minuto, nada além disso.
   */
  carga: number;
}

/**
 * O pulso da plataforma: o quanto a Rotta está em movimento agora.
 *
 * ## Por que existe
 *
 * Pedido do fundador em 05/10/2026: "a cada ação feita na Rotta, tanto
 * no app quanto na web, deverá mostrar a animação deles trabalhando", e
 * "de acordo com as ações feitas no escritório deverá refletir na Rotta
 * e vice-versa".
 *
 * Até agora a intensidade dos agentes no escritório 3D era uma barra
 * que o próprio fundador arrastava. Isso tornava a cena uma maquete:
 * bonita, e sem relação nenhuma com o produto. Com este endpoint, a
 * sala dos agentes ferve quando tem van na rua e desacelera quando não
 * tem, e passa a dizer algo verdadeiro sobre a plataforma.
 *
 * ## Como a carga é calculada
 *
 * Cada sinal é normalizado contra um teto plausível para a Rotta de
 * hoje (uma transportadora pagante, seis em teste) e os pesos somam 1.
 * Os tetos estão escritos aqui em vez de escondidos, porque eles vão
 * ficar pequenos conforme a plataforma crescer, e quem vier depois
 * precisa achá-los rápido.
 *
 * Posição de veículo pesa mais que todo o resto junto, e é intencional:
 * é o único sinal que só existe quando há uma van andando com criança
 * dentro, que é literalmente o produto funcionando.
 *
 * ## O que NÃO sai daqui
 *
 * Nenhum identificador, nenhum nome, nenhuma coordenada. Só contagem.
 * Uma tela de animação não precisa saber QUEM está em movimento.
 */
@Injectable()
export class PulsoService {
  /** Tetos de normalização. Sobem conforme a plataforma crescer. */
  private static readonly TETO = {
    viagens: 12,
    posicoes: 600,
    eventos: 120,
    contas: 15,
  };

  constructor(private readonly prisma: PrismaService) {}

  async medir(): Promise<PulsoDaPlataforma> {
    const agora = Date.now();
    const umaHora = new Date(agora - 60 * 60 * 1000);
    const umDia = new Date(agora - 24 * 60 * 60 * 1000);

    return this.prisma.runWithTenantContext({ tenantId: null, bypass: true }, async () => {
      const [viagens, posicoes, eventos, contas, erros] = await Promise.all([
        this.prisma.trip.count({ where: { status: TripStatus.EM_ANDAMENTO } }),
        this.prisma.tripPosition.count({ where: { capturadaEm: { gte: umaHora } } }),
        this.prisma.tripStudentEvent.count({ where: { processadoEm: { gte: umDia } } }),
        this.prisma.user.count({ where: { createdAt: { gte: umDia } } }),
        this.prisma.clientErrorReport.count({ where: { createdAt: { gte: umDia } } }),
      ]);

      const { TETO } = PulsoService;
      const fatia = (valor: number, teto: number): number => Math.min(1, valor / teto);

      const carga =
        fatia(posicoes, TETO.posicoes) * 0.55 +
        fatia(viagens, TETO.viagens) * 0.25 +
        fatia(eventos, TETO.eventos) * 0.12 +
        fatia(contas, TETO.contas) * 0.08;

      return {
        medidoEm: new Date().toISOString(),
        viagensEmAndamento: viagens,
        posicoesNaUltimaHora: posicoes,
        eventosDeAluno24h: eventos,
        contasNovas24h: contas,
        errosDeCliente24h: erros,
        carga: Number(carga.toFixed(3)),
      };
    });
  }
}
