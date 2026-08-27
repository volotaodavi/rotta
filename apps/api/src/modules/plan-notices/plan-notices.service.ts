import { Inject, Injectable } from "@nestjs/common";

import { toPlanNoticeResponseDto } from "./mappers/plan-notice.mapper";
import { PLAN_NOTICE_REPOSITORY } from "./plan-notices.constants";

import type { CreatePlanNoticeDto } from "./dto/create-plan-notice.dto";
import type { ListPlanNoticesQueryDto } from "./dto/list-plan-notices-query.dto";
import type {
  ListPlanNoticesResponseDto,
  PlanNoticeResponseDto,
} from "./dto/plan-notice-response.dto";
import type { PlanNoticeRepository } from "./repositories/plan-notice.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

/**
 * Avisos de plano (Dossiê 26, painel Admin "Controle de Planos") —
 * quem escreve é sempre o Admin Rotta (pedido do usuário: "os admins
 * poderão... propor avisos de cada plano"), nunca a própria empresa.
 * Global (`companyId` ausente) ou de uma empresa específica.
 */
@Injectable()
export class PlanNoticesService {
  constructor(
    @Inject(PLAN_NOTICE_REPOSITORY) private readonly planNoticeRepository: PlanNoticeRepository,
  ) {}

  async create(dto: CreatePlanNoticeDto, actor: AuthenticatedUser): Promise<PlanNoticeResponseDto> {
    const created = await this.planNoticeRepository.create({
      titulo: dto.titulo,
      corpo: dto.corpo,
      companyId: dto.companyId ?? null,
      criadoPorUserId: actor.sub,
    });
    return toPlanNoticeResponseDto(created);
  }

  async list(query: ListPlanNoticesQueryDto): Promise<ListPlanNoticesResponseDto> {
    const { items, total } = await this.planNoticeRepository.list({
      page: query.page,
      pageSize: query.pageSize,
      companyId: query.companyId,
    });
    return {
      items: items.map(toPlanNoticeResponseDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async setAtivo(id: string, ativo: boolean): Promise<PlanNoticeResponseDto> {
    const updated = await this.planNoticeRepository.setAtivo(id, ativo);
    return toPlanNoticeResponseDto(updated);
  }

  /** Empresa/Gestor lendo os avisos ativos (globais + os da própria empresa) — ver `BillingController.getMyNotices`. */
  async listActiveForCompany(companyId: string): Promise<PlanNoticeResponseDto[]> {
    const items = await this.planNoticeRepository.listActiveForCompany(companyId);
    return items.map(toPlanNoticeResponseDto);
  }
}
