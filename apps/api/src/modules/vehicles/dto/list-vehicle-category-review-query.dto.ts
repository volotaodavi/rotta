import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

/**
 * Fila `GET /vehicles/revisao-categoria` (Frente AL) — só veículos com
 * `categoriaRevisaoStatus = PENDENTE`, ou seja, onde a confiança da IA
 * (`VehicleCategoryClassifierService`) ficou abaixo do limiar. Não tem
 * `search`/`status`/`tipo` de `ListVehiclesQueryDto`: esta fila é
 * deliberadamente enxuta — o admin só precisa filtrar por empresa.
 */
export class ListVehicleCategoryReviewQueryDto {
  @ApiPropertyOptional({ description: "Filtra a fila por uma empresa específica" })
  @IsOptional()
  @IsUUID()
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
