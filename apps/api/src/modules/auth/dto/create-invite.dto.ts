import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

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
}
