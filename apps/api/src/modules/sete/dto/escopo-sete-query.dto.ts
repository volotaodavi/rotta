import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

/** Escopo das rotas de leitura do SETE (pendências e município). */
export class EscopoSeteQueryDto {
  @ApiPropertyOptional({
    description: "Só o Admin Rotta informa. Empresa e Gestor usam sempre o próprio tenant.",
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
