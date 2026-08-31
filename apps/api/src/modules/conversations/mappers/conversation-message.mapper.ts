import type { ConversationMessageResponseDto } from "../dto/conversation-message-response.dto";
import type { ConversationMessageWithAutor } from "../repositories/conversation.repository";

export function toConversationMessageResponseDto(
  message: ConversationMessageWithAutor,
  actorUserId: string,
): ConversationMessageResponseDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    autorUserId: message.autorUserId,
    autorNome: message.autor.nome,
    autorRole: message.autorRole,
    souEu: message.autorUserId === actorUserId,
    mensagem: message.mensagem,
    lidaEm: message.lidaEm,
    createdAt: message.createdAt,
  };
}
