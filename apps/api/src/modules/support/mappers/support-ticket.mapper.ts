import { toSupportMessageResponseDto } from "./support-message.mapper";

import type {
  SupportTicketDetailResponseDto,
  SupportTicketResponseDto,
} from "../dto/support-ticket-response.dto";
import type { SupportMessageWithRelations } from "../repositories/support-message.repository";
import type { SupportTicketWithRelations } from "../repositories/support-ticket.repository";

export function toSupportTicketResponseDto(
  ticket: SupportTicketWithRelations,
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
    resumoIA: ticket.resumoIA,
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
): SupportTicketDetailResponseDto {
  return {
    ...toSupportTicketResponseDto(ticket),
    mensagens: messages.map(toSupportMessageResponseDto),
  };
}
