import type { PlanNoticeResponseDto } from "../dto/plan-notice-response.dto";
import type { PlanNoticeWithRelations } from "../repositories/plan-notice.repository";

export function toPlanNoticeResponseDto(notice: PlanNoticeWithRelations): PlanNoticeResponseDto {
  return {
    id: notice.id,
    titulo: notice.titulo,
    corpo: notice.corpo,
    companyId: notice.companyId,
    companyNomeFantasia: notice.company?.nomeFantasia ?? null,
    ativo: notice.ativo,
    criadoPorNome: notice.criadoPor.nome,
    createdAt: notice.createdAt,
  };
}
