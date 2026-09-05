import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CompanyStatus, NotificationEventType, SupportTicketStatus } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";
import { AdminInboxEmailService } from "@/infra/email/admin-inbox-email.service";
import { BillingService } from "@/modules/billing/billing.service";
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
  /** `null` = Asaas não configurada nesse ambiente (stub honesto, nunca finge 0). */
  faturamentoCentavos: number | null;
  /** Recebido menos taxa retida da Asaas — `null` pelo mesmo motivo acima. */
  lucroLiquidoCentavos: number | null;
}

/**
 * "Informativos da Rotta" pro Admin (pedido do usuário 01/09/2026) —
 * resumo semanal/mensal com os números que importam pra rodar o
 * negócio: novos clientes, assinaturas, chamados de suporte,
 * faturamento e lucro líquido (baseado nas taxas retidas, 100% Asaas
 * desde 05/09/2026 — pedido do usuário: "esquece a AbacatePay").
 * Disparado por `AdminDigestSchedulerService` (QStash, cron), nunca por
 * uma ação de usuário — por isso não vive em `BillingService`/
 * `SupportService` (que reagem a eventos), mas num módulo cross-domain
 * próprio, que só reaproveita `BillingService.reconciliarPagamentosAsaas`
 * pra não duplicar a lógica de paginação/reconciliação.
 */
@Injectable()
export class AdminDigestService {
  private readonly logger = new Logger(AdminDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly usersService: UsersService,
    private readonly messagePersonalizationService: MessagePersonalizationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly adminInboxEmailService: AdminInboxEmailService,
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
        await this.calcularFaturamentoAsaas(periodo);

      return {
        periodo,
        novasEmpresas,
        novasAssinaturas,
        planosAtivosAgora,
        chamadosAbertos,
        chamadosEncerrados,
        faturamentoCentavos,
        lucroLiquidoCentavos,
      };
    });
  }

  /** `null`/`null` quando a Asaas não está configurada ou a consulta falha — nunca finge 0 (stub honesto, mesmo padrão de `BillingService.getAdminOverview`). */
  private async calcularFaturamentoAsaas(
    periodo: DigestPeriod,
  ): Promise<{ faturamentoCentavos: number | null; lucroLiquidoCentavos: number | null }> {
    try {
      const { totalRecebidoCentavos, totalTaxaRetidaCentavos } =
        await this.billingService.reconciliarPagamentosAsaas({
          inicio: periodo.inicio,
          fim: periodo.fim,
        });
      return {
        faturamentoCentavos: totalRecebidoCentavos,
        lucroLiquidoCentavos: totalRecebidoCentavos - totalTaxaRetidaCentavos,
      };
    } catch (error) {
      this.logger.warn(
        `Falha ao calcular faturamento Asaas pro resumo do Admin: ${
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
      faturamentoCentavos: resumo.faturamentoCentavos,
      lucroLiquidoCentavos: resumo.lucroLiquidoCentavos,
    });
    // Caixa fixa da Rotta (pedido do usuário 01/09/2026) — garante a
    // entrega mesmo sem nenhuma conta Admin Rotta real configurada.
    // "financeiro": resumo semanal/mensal é relatório de faturamento.
    void this.adminInboxEmailService.send(mensagem.titulo, mensagem.corpo, "financeiro");

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
