import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IdentityVerificationStatus } from "@prisma/client";

/**
 * Uma linha de `GET /drivers/team` — visão da empresa sobre seus
 * próprios Motoristas/Monitores/Gestores, INCLUINDO o status de
 * verificação de identidade Didit (`User.identityVerificationStatus`).
 * Antes desta entrega não existia nenhuma tela onde a empresa via isso
 * — só o próprio motorista via o resultado da própria verificação
 * (`/verificacao-identidade`), o que deixava o dono da empresa sem
 * nenhuma visibilidade e "esperando indefinidamente" mesmo depois da
 * Didit já ter decidido.
 */
export class TeamMemberResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty() nome!: string;
  @ApiProperty() email!: string;
  @ApiProperty() telefone!: string;
  @ApiProperty({ enum: ["motorista", "monitor", "gestor"] })
  papel!: "motorista" | "monitor" | "gestor";
  @ApiProperty({ enum: IdentityVerificationStatus })
  identityVerificationStatus!: IdentityVerificationStatus;
  @ApiPropertyOptional({
    description: "Motivo legível quando REPROVADA — null em qualquer outro status.",
  })
  identityVerificationMotivo?: string | null;
  @ApiPropertyOptional() identityVerifiedAt?: Date | null;
}
