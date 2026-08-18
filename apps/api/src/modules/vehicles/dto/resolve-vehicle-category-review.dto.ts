import { ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleCategory } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

/**
 * `PATCH /vehicles/:id/revisao-categoria` (Frente AL, Admin Rotta) —
 * pedido do usuário: "os admins da Rotta irão analisar manualmente a
 * situação". Sem `categoria`: confirma a sugestão da IA
 * (`categoriaRevisaoStatus` vira `CONFIRMADA`). Com uma `categoria`
 * diferente da sugerida: corrige (`CORRIGIDA`, `Vehicle.categoria`
 * atualizado). A empresa nunca fica bloqueada esperando essa decisão —
 * ela já está usando a categoria que a IA sugeriu desde o cadastro.
 */
export class ResolveVehicleCategoryReviewDto {
  @ApiPropertyOptional({ enum: VehicleCategory })
  @IsOptional()
  @IsEnum(VehicleCategory)
  categoria?: VehicleCategory;
}
