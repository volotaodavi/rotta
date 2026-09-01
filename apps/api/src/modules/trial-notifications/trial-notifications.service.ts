import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CompanyStatus, NotificationEventType, type Company } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";
import { TRIAL_GRACE_DAYS } from "@/modules/companies/companies.constants";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { UsersService } from "@/modules/users/users.service";
import { Role } from "@/shared/enums";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Data em UTC, sem hora — só o dia importa aqui (mesmo raciocínio de `admin-digest`). */
function apenasData(data: Date): number {
  return Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
}

/**
 * Quantos dias faltam pro trial vencer, em dias INTEIROS de calendário
 * (nunca horas/frações) — positivo = ainda dentro do trial, `0` = vence
 * hoje, negativo = já venceu (dias contados a partir do vencimento).
 */
export function diasAteTrialExpirar(trialExpiraEm: Date, referencia: Date): number {
  return Math.round((apenasData(trialExpiraEm) - apenasData(referencia)) / MS_PER_DAY);
}

/**
 * "Informativos" de trial pro Empresa/Gestor (pedido do usuário
 * 01/09/2026: "pagamento aprovado/recusado/pendente... trial
 * expirando"). `Company.trialExpiraEm` existe desde a Frente de trial
 * de 1 mês grátis, mas nada disparava as 3 notificações que já estavam
 * configuradas no `NotificationChannelSelectorService`
 * (`TRIAL_EXPIRANDO`/`TRIAL_VENCE_HOJE`/`TRIAL_BLOQUEADO`) — gap real
 * corrigido aqui.
 *
 * Disparado por `TrialNotificationsSchedulerService` (QStash, cron
 * diário), nunca por uma ação de usuário — por isso vive num módulo
 * próprio, igual `AdminDigestService`.
 *
 * Marcos escolhidos (dias de calendário, não a regra exata a segundo de
 * `resolveTrialBloqueioMotivo`, que É o que de fato bloqueia — este job
 * só avisa, o `TrialGuard` continua sendo a única fonte de verdade da
 * trava real):
 * - `diasRestantes === 3`: TRIAL_EXPIRANDO (3 dias de antecedência).
 * - `diasRestantes === 0`: TRIAL_VENCE_HOJE.
 * - `diasRestantes === -(TRIAL_GRACE_DAYS + 1)`: TRIAL_BLOQUEADO — o
 *   primeiro dia de calendário em que `resolveTrialBloqueioMotivo` já
 *   bloqueia com certeza (o dia de graça inteiro já passou).
 *
 * Cada marco é um `===` exato, nunca um `<=` — como o job roda uma vez
 * por dia e `diasRestantes` só decresce, cada empresa recebe CADA aviso
 * no máximo uma vez (sem precisar de um campo de dedup no schema).
 * Risco aceito, documentado: se o job ficar fora do ar num dia exato de
 * marco, aquele aviso específico é perdido (não há retroatividade) —
 * mesmo trade-off já aceito em outros jobs diários desta base.
 */
@Injectable()
export class TrialNotificationsService {
  private readonly logger = new Logger(TrialNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly messagePersonalizationService: MessagePersonalizationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  resolveEvento(
    diasRestantes: number,
  ):
    | typeof NotificationEventType.TRIAL_EXPIRANDO
    | typeof NotificationEventType.TRIAL_VENCE_HOJE
    | typeof NotificationEventType.TRIAL_BLOQUEADO
    | null {
    if (diasRestantes === 3) return NotificationEventType.TRIAL_EXPIRANDO;
    if (diasRestantes === 0) return NotificationEventType.TRIAL_VENCE_HOJE;
    if (diasRestantes === -(TRIAL_GRACE_DAYS + 1)) return NotificationEventType.TRIAL_BLOQUEADO;
    return null;
  }

  /** Chamado pelo job diário — avalia toda empresa em TRIAL e notifica quem bateu um marco hoje. */
  async avaliarTodasAsEmpresas(referencia: Date = new Date()): Promise<{ notificadas: number }> {
    const empresas = await this.prisma.runWithTenantContext({ tenantId: null, bypass: true }, () =>
      this.prisma.company.findMany({
        where: { status: CompanyStatus.TRIAL, trialExpiraEm: { not: null } },
      }),
    );

    let notificadas = 0;
    for (const empresa of empresas) {
      if (!empresa.trialExpiraEm) continue;
      const diasRestantes = diasAteTrialExpirar(empresa.trialExpiraEm, referencia);
      const evento = this.resolveEvento(diasRestantes);
      if (!evento) continue;

      await this.notificarBestEffort(empresa, evento, diasRestantes);
      notificadas += 1;
    }

    this.logger.log(
      `Avaliação diária de trial: ${empresas.length} empresa(s) em TRIAL, ${notificadas} notificada(s) hoje.`,
    );
    return { notificadas };
  }

  private async notificarBestEffort(
    empresa: Company,
    evento:
      | typeof NotificationEventType.TRIAL_EXPIRANDO
      | typeof NotificationEventType.TRIAL_VENCE_HOJE
      | typeof NotificationEventType.TRIAL_BLOQUEADO,
    diasRestantes: number,
  ): Promise<void> {
    try {
      const mensagem =
        evento === NotificationEventType.TRIAL_EXPIRANDO
          ? this.messagePersonalizationService.trialExpirando(diasRestantes)
          : evento === NotificationEventType.TRIAL_VENCE_HOJE
            ? this.messagePersonalizationService.trialVenceHoje()
            : this.messagePersonalizationService.trialBloqueado();

      const memberships = await this.usersService.listMembershipsByCompany(empresa.id);
      for (const membership of memberships) {
        if ((membership.role as Role) !== Role.EMPRESA && (membership.role as Role) !== Role.GESTOR)
          continue;
        this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
          userId: membership.userId,
          companyId: empresa.id,
          tipo: evento,
          titulo: mensagem.titulo,
          corpo: mensagem.corpo,
        });
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao notificar a empresa ${empresa.id} sobre trial (${evento}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
