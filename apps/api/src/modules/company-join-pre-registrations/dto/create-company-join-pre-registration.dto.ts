import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

import { Role } from "@/shared/enums";

/** Sempre motorista ou monitor — mesma convenção de `CompanyJoinRequest.role`/`Invite.role`. */
const PRE_REGISTRABLE_ROLES = [Role.MOTORISTA, Role.MONITOR] as const;

/**
 * "Convites" (pedido do usuário 02/09/2026) — o gestor pré-cadastra o
 * celular e/ou o nome de quem já sabe que vai contratar, ANTES de a
 * pessoa informar o código da empresa. Pelo menos um dos dois campos é
 * obrigatório (checado em `CompanyJoinPreRegistrationsService.create`,
 * cross-field — `class-validator` puro não expressa "ao menos um de
 * dois campos opcionais" de forma legível).
 */
export class CreateCompanyJoinPreRegistrationDto {
  @ApiProperty({ enum: PRE_REGISTRABLE_ROLES, example: Role.MOTORISTA })
  @IsIn(PRE_REGISTRABLE_ROLES)
  role!: Role;

  @ApiPropertyOptional({ example: "Carlos Alberto" })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nome?: string;

  @ApiPropertyOptional({ example: "(11) 98888-7777" })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  celular?: string;
}

export { PRE_REGISTRABLE_ROLES };
