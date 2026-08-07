import { Inject, Injectable } from "@nestjs/common";

import { BACKOFFICE_REPOSITORY } from "./backoffice.constants";

import type { AccessAsSupportDto } from "./dto/access-as-support.dto";
import type { ApprovalQueueResponseDto } from "./dto/approval-queue-response.dto";
import type { BackofficeDashboardResponseDto } from "./dto/backoffice-dashboard-response.dto";
import type { BackofficeRepository } from "./repositories/backoffice.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { CompanyResponseDto } from "@/modules/companies/dto/company-response.dto";

import { AuditLogService } from "@/modules/audit/audit-log.service";
import { CompaniesService } from "@/modules/companies/companies.service";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

/**
 * Núcleo de negócio do Backoffice (Prompt 21 / Dossiê 29) — "tela
 * inicial" do Admin Rotta (`ADM-01`/Dossiê 11 §6.1) e o mecanismo
 * auditado de "Acessar como suporte" (`ADM-01`, `RN-10`). Todo endpoint
 * deste módulo é exclusivo de `Role.ADMIN_ROTTA` (garantido pelo
 * controller) — nunca reimplementa RBAC/consultas de outros módulos,
 * só agrega leitura (`BackofficeRepository`) e reusa `CompaniesService`
 * para a ficha do tenant.
 */
@Injectable()
export class BackofficeService {
  constructor(
    @Inject(BACKOFFICE_REPOSITORY) private readonly backofficeRepository: BackofficeRepository,
    private readonly companiesService: CompaniesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getDashboard(): Promise<BackofficeDashboardResponseDto> {
    const summary = await this.backofficeRepository.getDashboardSummary();
    return {
      ...summary,
      aprovacoesPendentesTotal:
        summary.documentosMotoristaPendentes +
        summary.documentosVeiculoPendentes +
        summary.contratosAguardandoAssinatura,
    };
  }

  async listApprovals(limitPerCategoria: number): Promise<ApprovalQueueResponseDto> {
    return this.backofficeRepository.listPendingApprovals(limitPerCategoria);
  }

  /**
   * `ADM-01`: "botão explícito 'Acessar como suporte' que só é usado com
   * justificativa registrada e gera log de auditoria imediato, nunca
   * acesso silencioso." Este método NÃO concede nenhum poder novo — o
   * Admin Rotta já bypassa RLS por ser `Role.ADMIN_ROTTA` (Dossiê 8
   * §15.2); o que este endpoint garante é que esse acesso específico
   * (ver os dados de UM tenant escolhido, com motivo) fica registrado
   * ANTES da leitura acontecer, nunca depois — `RN-10`: "todo acesso do
   * Admin Rotta a dado de um tenant gera log de auditoria imutável,
   * inclusive leitura." Por isso o registro de auditoria AQUI é
   * ESTRITO (nunca best-effort, ao contrário de `recordAudit`/outros
   * módulos): se o log não puder ser gravado, o acesso é negado — a
   * garantia de `RN-10` é o próprio propósito do endpoint, não um
   * efeito colateral dele.
   */
  async accessAsSupport(
    companyId: string,
    dto: AccessAsSupportDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<CompanyResponseDto> {
    const company = await this.companiesService.findByIdOrThrow(companyId, actor);

    await this.auditLogService.record({
      companyId,
      entidadeTipo: "Company",
      entidadeId: companyId,
      acao: "ADMIN_ACCESSED_AS_SUPPORT",
      atorUserId: actor.sub,
      dadosDepois: { motivo: dto.motivo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return company;
  }
}
