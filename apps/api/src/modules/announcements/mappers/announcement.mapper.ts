import type { AnnouncementResponseDto } from "../dto/announcement-response.dto";
import type { AnnouncementWithAutor } from "../repositories/announcement.repository";

export function toAnnouncementResponseDto(
  announcement: AnnouncementWithAutor,
): AnnouncementResponseDto {
  return {
    id: announcement.id,
    titulo: announcement.titulo,
    corpo: announcement.corpo,
    publico: announcement.publico,
    criadoPorUserId: announcement.criadoPorUserId,
    criadoPorNome: announcement.criadoPor.nome,
    destinatariosCount: announcement.destinatariosCount,
    createdAt: announcement.createdAt,
  };
}
