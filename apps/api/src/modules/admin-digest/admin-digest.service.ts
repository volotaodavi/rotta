import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CompanyStatus, NotificationEventType, SupportTicketStatus } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";
import { AbacatePayClientService } from "@/modules/billing/abacatepay-client.service";
import {
  ABACATEPAY_FEE_CARD_FIXED_CENTS,
  ABACATEPAY_FEE_CARD_PERCENT,
  ABACATEPAY_FEE_PIX_CENTS,
} from "@/modules/billing/billing.constants";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { UsersService } from "@/modules/users/users.service";

/** Uma janela de tempo fechada (`inicio` inclusive, `fim` exclusivo) — nunca aberta, pra nunca contar o mesmo evento em dois resumos seguidos. */
export interface DigestPeriod {
  inicio: Date;
  fim: Date;
  /** "semana" | "mês" — só pro texto da mensagem, nunca usado pra lógica. */
  label: string;
}

export interface AdminDigestSummary {
  periodo: DigestPeriod;
  novasEmpresas: number;
  /**
   * Aproximação, mesmo critério já usado em `BillingService.
   * getAdminOverview` (`ativaDesde: company.updatedAt`) — não existe um
   * campo dedicado "assinatura ativada em" no schema hoje. Conta
   * empresas `ATIVO` cujo `updatedAt` caiu dentro do período; qualquer
   * outra atualização na empresa nessa janela também entra (ex.: Admin
   * editou o cadastro), então é um teto, não um número exato.
   */
  novasAssinaturas: number;
  planosAtivosAgora: number;
  chamadosAbertos: number;
  chamadosEncerrados: number;
  /** `null` = AbacatePay não configurada nesse ambiente (stub honesto, nunca finge 0). */
  faturamentoAbacatePayCentavos: number | null;
  /** `null` pelo mesmo motivo de `BillingService.getAdminOverview` — Asaas ainda não tem um "billing/list" mapeado aqui (ver nota lá). */
  faturamentoAsaasCentavos: null;
  /** Só reflete AbacatePay hoje, pela mesma razão acima — nunca `null` vira 0 fingido, nunca soma um valor Asaas que não existe. */
  lucroLiquidoAbacatePayCentavos: number | null;
}

/**
 * "Informativos da Rotta" pro Admin (pedido do usuário 01/09/2026) —
 * resumo semanal/mensal com os números que importam pra rodar o
 * negócio: novos clientes, assinaturas, chamados de suporte,
 * faturamento e lucro líquido (baseado nas taxas retidas). Disparado
 * por `AdminDigestSchedulerService` (QStash, cron), nunca por uma ação
 * de usuário — por isso não vive em `BillingService`/`SupportService`
 * (que reagem a eventos), mas num módulo cross-domain próprio.
 *
 * `faturamentoAsaasCentavos`/parte do `lucroLiquido` ficam `null` até a
 * reconciliação de pagamentos Asaas ser construída (mesmo gap já
 * documentado em `BillingService.getAdminOverview` — este relatório só
 * herda a mesma limitação, não a esconde).
 */
@Injectable()
export class AdminDigestService {
  private readonly logger = new Logger(AdminDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly abacatePayClient: AbacatePayClientService,
    private readonly usersService: UsersService,
    private readonly messagePersonalizationService: MessagePersonalizationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async gerarResumo(periodo: DigestPeriod): Promise<AdminDigestSummary> {
    return this.prisma.runWithTenantContext({ tenantId: null, bypass: true }, async () => {
      const [
        novasEmpresas,
        novasAssinaturas,
        planosAtivosAgora,
        chamadosAbertos,
        chamadosEncerrados,
      ] = await Promise.all([
        this.prisma.company.count({
          where: { createdAt: { gte: periodo.inicio, lt: periodo.fim } },
        }),
        this.prisma.company.count({
          where: {
            status: CompanyStatus.ATIVO,
            updatedAt: { gte: periodo.inicio, lt: periodo.fim },
          },
        }),
        this.prisma.company.count({ where: { status: CompanyStatus.ATIVO } }),
        this.prisma.supportTicket.count({
          where: { createdAt: { gte: periodo.inicio, lt: periodo.fim } },
        }),
        this.prisma.supportTicket.count({
          where: {
            status: SupportTicketStatus.ENCERRADO,
            encerradoEm: { gte: periodo.inicio, lt: periodo.fim },
          },
        }),
      ]);

      const { faturamentoCentavos, lucroLiquidoCentavos } =
        await this.calcularFaturamentoAbacatePay(periodo);

      return {
        periodo,
        novasEmpresas,
        novasAssinaturas,
        planosAtivosAgora,
        chamadosAbertos,
        chamadosEncerrados,
        faturamentoAbacatePayCentavos: faturamentoCentavos,
        faturamentoAsaasCentavos: null,
        lucroLiquidoAbacatePayCentavos: lucroLiquidoCentavos,
      };
    });
  }

  /** `null`/`null` quando a AbacatePay não está configurada ou a consulta falha — nunca finge 0 (stub honesto, mesmo padrão de `BillingService.getAdminOverview`). */
  private async calcularFaturamentoAbacatePay(
    periodo: DigestPeriod,
  ): Promise<{ faturamentoCentavos: number | null; lucroLiquidoCentavos: number | null }> {
    if (!this.abacatePayClient.isConfigured()) {
      return { faturamentoCentavos: null, lucroLiquidoCentavos: null };
    }

    try {
      const billings = await this.abacatePayClient.listBillings();
      const pagasNoPeriodo = billings.filter((billing) => {
        if (billing.status !== "PAID" || !billing.paidAt) return false;
        const paidAt = new Date(billing.paidAt);
        return paidAt >= periodo.inicio && paidAt < periodo.fim;
      });

      const faturamentoCentavos = pagasNoPeriodo.reduce((soma, b) => soma + b.amount, 0);
      const taxaCentavos = pagasNoPeriodo.reduce((soma, b) => {
        const metodo = b.methods?.[0] ?? "CARD";
        const taxa =
          metodo === "PIX"
            ? ABACATEPAY_FEE_PIX_CENTS
            : Math.round(b.amount * ABACATEPAY_FEE_CARD_PERCENT) + ABACATEPAY_FEE_CARD_FIXED_CENTS;
        return soma + taxa;
      }, 0);

      return {
        faturamentoCentavos,
        lucroLiquidoCentavos: faturamentoCentavos - taxaCentavos,
      };
    } catch (error) {
      this.logger.warn(
        `Falha ao calcular faturamento AbacatePay pro resumo do Admin: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { faturamentoCentavos: null, lucroLiquidoCentavos: null };
    }
  }

  /** Últimos 7 dias corridos antes de `referencia` — usado pelo job semanal (`AdminDigestQueueController`). */
  periodoUltimaSemana(referencia: Date = new Date()): DigestPeriod {
    const fim = referencia;
    const inicio = new Date(fim);
    inicio.setDate(inicio.getDate() - 7);
    return { inicio, fim, label: "semanal" };
  }

  /**
   * Mês corrido ANTERIOR ao mês de `referencia` (limites de calendário,
   * não "30 dias atrás") — se `referencia` cai em setembro, o período é
   * agosto inteiro. Robusto a `referencia` não bater exatamente com a
   * meia-noite do dia 1º (QStash não é pontual ao segundo).
   */
  periodoUltimoMes(referencia: Date = new Date()): DigestPeriod {
    const fim = new Date(Date.UTC(referencia.getUTCFullYear(), referencia.getUTCMonth(), 1));
    const inicio = new Date(Date.UTC(referencia.getUTCFullYear(), referencia.getUTCMonth() - 1, 1));
    return { inicio, fim, label: "mensal" };
  }

  /** Chamado por `AdminDigestSchedulerService` — monta o resumo e notifica todo Admin Rotta (push + e-mail). */
  async enviarResumo(
    tipo: "RELATORIO_SEMANAL" | "RELATORIO_MENSAL",
    periodo: DigestPeriod,
  ): Promise<AdminDigestSummary> {
    const resumo = await this.gerarResumo(periodo);
    const mensagem = this.messagePersonalizationService.relatorioAdmin({
      label: resumo.periodo.label,
      novasEmpresas: resumo.novasEmpresas,
      novasAssinaturas: resumo.novasAssinaturas,
      planosAtivosAgora: resumo.planosAtivosAgora,
      chamadosAbertos: resumo.chamadosAbertos,
      chamadosEncerrados: resumo.chamadosEncerrados,
      faturamentoAbacatePayCentavos: resumo.faturamentoAbacatePayCentavos,
      lucroLiquidoAbacatePayCentavos: resumo.lucroLiquidoAbacatePayCentavos,
    });
    const adminIds = await this.usersService.listAdminRottaUserIds();

    for (const adminUserId of adminIds) {
      this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
        userId: adminUserId,
        tipo: NotificationEventType[tipo],
        titulo: mensagem.titulo,
        corpo: mensagem.corpo,
      });
    }

    this.logger.log(
      `Resumo ${resumo.periodo.label} enviado a ${adminIds.length} Admin Rotta: ${resumo.novasEmpresas} nova(s) empresa(s), ${resumo.novasAssinaturas} nova(s) assinatura(s), ${resumo.chamadosAbertos} chamado(s) aberto(s), ${resumo.chamadosEncerrados} encerrado(s).`,
    );

    return resumo;
  }
}
