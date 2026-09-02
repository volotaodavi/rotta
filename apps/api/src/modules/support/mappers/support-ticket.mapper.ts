import { toSupportMessageResponseDto } from "./support-message.mapper";

import type {
  SupportTicketDetailResponseDto,
  SupportTicketResponseDto,
} from "../dto/support-ticket-response.dto";
import type { SupportMessageWithRelations } from "../repositories/support-message.repository";
import type { SupportTicketWithRelations } from "../repositories/support-ticket.repository";

/**
 * `isAdmin` (achado em auditoria de segurança 02/09/2026): `resumoIA` é
 * documentado em todo o módulo como "visível só no Admin" — mas até
 * aqui o mapper devolvia o campo pra QUALQUER ator com acesso ao
 * ticket (Empresa/Gestor/Responsável incluídos), porque o mesmo DTO
 * serve todos os papéis. Corrigido strippando o campo (`undefined`,
 * nunca chega no JSON) quando quem chama não é `Role.ADMIN_ROTTA` —
 * ver todos os call-sites em `SupportService`, que agora passam
 * `actor.role === Role.ADMIN_ROTTA`.
 */
export function toSupportTicketResponseDto(
  ticket: SupportTicketWithRelations,
  isAdmin: boolean,
): SupportTicketResponseDto {
  return {
    id: ticket.id,
    companyId: ticket.companyId,
    companyNome: ticket.company.nomeFantasia,
    abertoPorUserId: ticket.abertoPorUserId,
    abertoPorNome: ticket.abertoPor.nome,
    abertoPorEmail: ticket.abertoPor.email,
    assunto: ticket.assunto,
    descricao: ticket.descricao,
    categoria: ticket.categoria,
    status: ticket.status,
    anexoUrl: ticket.anexoUrl,
    protocolo: ticket.protocolo,
    resumoIA: isAdmin ? ticket.resumoIA : undefined,
    arquivado: ticket.arquivado,
    arquivadoEm: ticket.arquivadoEm,
    encerradoEm: ticket.encerradoEm,
    encerradoPorNome: ticket.encerradoPor?.nome ?? null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

export function toSupportTicketDetailResponseDto(
  ticket: SupportTicketWithRelations,
  messages: SupportMessageWithRelations[],
  isAdmin: boolean,
): SupportTicketDetailResponseDto {
  return {
    ...toSupportTicketResponseDto(ticket, isAdmin),
    mensagens: messages.map(toSupportMessageResponseDto),
  };
}
