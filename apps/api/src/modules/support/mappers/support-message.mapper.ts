import type { SupportMessageResponseDto } from "../dto/support-message-response.dto";
import type { SupportMessageWithRelations } from "../repositories/support-message.repository";

export function toSupportMessageResponseDto(
  message: SupportMessageWithRelations,
): SupportMessageResponseDto {
  return {
    id: message.id,
    ticketId: message.ticketId,
    autorUserId: message.autorUserId,
    autorNome: message.autor?.nome ?? "Rotta AI",
    autorIsAdminRotta: message.autorIsAdminRotta,
    autorIsIA: message.autorIsIA,
    mensagem: message.mensagem,
    anexoUrl: message.anexoUrl,
    createdAt: message.createdAt,
  };
}
