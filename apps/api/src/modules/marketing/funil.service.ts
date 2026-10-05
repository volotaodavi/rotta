import { Injectable } from "@nestjs/common";
import { CompanyStatus, PendingSubscriptionStatus } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

export interface FunilDaRotta {
  geradoEm: string;
  /** Quantas transportadoras existem em cada estado. */
  transportadoras: {
    emTeste: number;
    pagando: number;
    inadimplentes: number;
    canceladas: number;
  };
  /** O checkout do site, que é onde o dinheiro de anúncio chega primeiro. */
  checkoutDoSite: {
    iniciados: number;
    abandonados: number;
    pagos: number;
    pagosQueViraramConta: number;
    pagosQueNuncaViraramConta: number;
    dinheiroParadoEmCentavos: number;
  };
  /** O que liga venda a anúncio. É a razão de o CMO ter acesso a isto. */
  atribuicao: {
    comCliqueDeAnuncio: number;
    comNavegadorConhecido: number;
    semNenhumSinal: number;
    pagosVindosDeAnuncio: number;
  };
  /** Se a compra confirmada está mesmo chegando ao Meta. */
  medicao: {
    comprasEnviadasAoMeta: number;
    comprasNaoEnviadas: number;
  };
}

/**
 * O funil da Rotta em números, para o turno do CMO.
 *
 * ## Por que isto existe
 *
 * A carta do CMO (`empresa/cargos/cmo.md`) manda olhar onde o cadastro
 * morre, e aponta para o Admin. Só que um turno agendado não tem conta
 * de admin nem acesso ao banco: sem este caminho, a "análise de funil"
 * do CMO seria leitura de código e palpite, exatamente o que a carta do
 * cargo proíbe. É o mesmo raciocínio do plantão de erro do CTO, para o
 * outro lado da casa.
 *
 * ## O que NÃO sai daqui
 *
 * Nenhum nome, e-mail, telefone, CPF, id de empresa ou de pessoa. Só
 * contagem e soma. Um relatório de marketing não precisa saber QUEM
 * abandonou o checkout, precisa saber QUANTOS e de onde vieram, e a
 * diferença entre as duas coisas é a diferença entre análise e
 * vazamento.
 */
@Injectable()
export class FunilService {
  constructor(private readonly prisma: PrismaService) {}

  async levantar(): Promise<FunilDaRotta> {
    return this.prisma.runWithTenantContext({ tenantId: null, bypass: true }, async () => {
      const [porStatus, pendentes] = await Promise.all([
        this.prisma.company.groupBy({ by: ["status"], _count: { _all: true } }),
        this.prisma.pendingSubscription.findMany({
          select: {
            status: true,
            paidAt: true,
            valorCentavos: true,
            linkedCompanyId: true,
            metaFbc: true,
            metaFbp: true,
            metaPurchaseEm: true,
          },
        }),
      ]);

      const contar = (status: CompanyStatus): number =>
        porStatus.find((linha) => linha.status === status)?._count._all ?? 0;

      const pagos = pendentes.filter(
        (p) => p.paidAt !== null || p.status === PendingSubscriptionStatus.PAGO,
      );
      const pagosSemConta = pagos.filter((p) => p.linkedCompanyId === null);

      return {
        geradoEm: new Date().toISOString(),
        transportadoras: {
          emTeste: contar(CompanyStatus.TRIAL),
          pagando: contar(CompanyStatus.ATIVO),
          inadimplentes: contar(CompanyStatus.INADIMPLENTE) + contar(CompanyStatus.SUSPENSO),
          canceladas: contar(CompanyStatus.CANCELADO),
        },
        checkoutDoSite: {
          iniciados: pendentes.length,
          abandonados: pendentes.length - pagos.length,
          pagos: pagos.length,
          pagosQueViraramConta: pagos.length - pagosSemConta.length,
          pagosQueNuncaViraramConta: pagosSemConta.length,
          dinheiroParadoEmCentavos: pagosSemConta.reduce((soma, p) => soma + p.valorCentavos, 0),
        },
        atribuicao: {
          comCliqueDeAnuncio: pendentes.filter((p) => p.metaFbc !== null).length,
          comNavegadorConhecido: pendentes.filter((p) => p.metaFbp !== null && p.metaFbc === null)
            .length,
          semNenhumSinal: pendentes.filter((p) => p.metaFbp === null && p.metaFbc === null).length,
          pagosVindosDeAnuncio: pagos.filter((p) => p.metaFbc !== null).length,
        },
        medicao: {
          comprasEnviadasAoMeta: pagos.filter((p) => p.metaPurchaseEm !== null).length,
          comprasNaoEnviadas: pagos.filter((p) => p.metaPurchaseEm === null).length,
        },
      };
    });
  }
}
