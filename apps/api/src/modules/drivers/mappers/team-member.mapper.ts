import type { TeamMemberResponseDto } from "../dto/team-member-response.dto";
import type { Membership, User } from "@prisma/client";

export function toTeamMemberResponseDto(membership: Membership, user: User): TeamMemberResponseDto {
  return {
    userId: user.id,
    nome: user.nome,
    email: user.email,
    telefone: user.telefone,
    papel: membership.role as TeamMemberResponseDto["papel"],
    identityVerificationStatus: user.identityVerificationStatus,
    identityVerificationMotivo: user.identityVerificationMotivo,
    identityVerifiedAt: user.identityVerifiedAt,
  };
}
