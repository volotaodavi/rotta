import type { RatingResponseDto } from "../dto/rating-response.dto";
import type { Rating } from "@prisma/client";

export function toRatingResponseDto(rating: Rating): RatingResponseDto {
  return {
    id: rating.id,
    contractId: rating.contractId,
    responsavelId: rating.responsavelId,
    companyId: rating.companyId,
    alvoTipo: rating.alvoTipo,
    alvoId: rating.alvoId,
    nota: rating.nota,
    comentario: rating.comentario,
    createdAt: rating.createdAt,
  };
}
