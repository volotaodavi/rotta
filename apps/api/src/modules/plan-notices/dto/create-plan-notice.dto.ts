import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

/**
 * `companyId` opcional — ausente/`null` publica um aviso GLOBAL (toda
 * empresa enxerga); setado publica só para a empresa apontada (Dossiê
 * 26, "Controle de Planos" — pedido do usuário: "pode ser de forma
 * global, quanto específica").
 */
export class CreatePlanNoticeDto {
  @ApiProperty({ minLength: 3 })
  @IsString()
  @MinLength(3)
  titulo!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  corpo!: string;

  @ApiPropertyOptional({ description: "Ausente/null = aviso global." })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
