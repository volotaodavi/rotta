import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/** Listagem de Alunos — RBAC decide o escopo (`responsavelId`/`companyId`/motorista-monitor), nunca o cliente. */
export class ListStudentsQueryDto {
  @ApiPropertyOptional({ description: "Busca por nome" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      "Filtra por empresa — só tem efeito pro Admin Rotta (pedido do usuário 02/09/2026: aba 'Alunos' em empresas/[id]). Empresa/Gestor sempre vê só a própria (`actor.tenantId`), ignora este campo.",
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
