import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

/**
 * Vincula a Escola à empresa do ator (briefing "PERMISSÕES" — Empresa/
 * Gestor atende esta escola). `companyId` só é lido do body quando o
 * ator é `Role.ADMIN_ROTTA` (sem tenant próprio, precisa dizer QUAL
 * empresa) — para Empresa/Gestor, qualquer valor aqui é ignorado em
 * favor de `actor.tenantId` (nunca confia em tenant vindo do cliente).
 */
export class CreateSchoolCompanyLinkDto {
  @ApiPropertyOptional({ description: "Obrigatório apenas quando o ator é Admin Rotta" })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
