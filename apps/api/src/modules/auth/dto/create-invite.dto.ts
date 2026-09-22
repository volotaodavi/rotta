import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsUUID } from "class-validator";

import { Role } from "@/shared/enums";

/**
 * Convite de papel (Dossiê 15, briefing "Convite de Motoristas") — nunca
 * `EMPRESA` (uma empresa não convida outra empresa para dentro de si) nem
 * `ADMIN_ROTTA` (contas internas, nunca por convite/self-service).
 */
const INVITABLE_ROLES = [
  Role.GESTOR,
  Role.MOTORISTA,
  Role.MONITOR,
  Role.RESPONSAVEL,
  Role.ESCOLA,
] as const;

export class CreateInviteDto {
  @ApiProperty({ enum: INVITABLE_ROLES, example: Role.MOTORISTA })
  @IsIn(INVITABLE_ROLES)
  role!: Role;

  @ApiPropertyOptional({
    description:
      "Obrigatório quando `role` é `ESCOLA`, proibido nos demais papéis: a escola de que a conta convidada será funcionária. É este campo que, no resgate, vira `User.escolaId` — a única coisa que define o que a conta enxerga no Portal da Escola.",
  })
  @IsOptional()
  @IsUUID()
  schoolId?: string;
}
