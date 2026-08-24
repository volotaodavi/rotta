import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, ArrayUnique, IsUUID } from "class-validator";

/**
 * Reordenação em lote das paradas de uma rota (Frente A do pedido
 * "otimize a Rotta Route AI" — fecha a lacuna de `route-optimization-
 * section.tsx`, que antes só sugeria a nova ordem sem nenhum jeito de
 * aplicá-la). `stopIds` é a sequência COMPLETA e final — o service
 * (`RoutesService.reorderStops`) valida que é exatamente o mesmo
 * conjunto de paradas já cadastradas na rota, nem uma a mais nem a
 * menos, antes de aplicar.
 */
export class ReorderRouteStopsDto {
  @ApiProperty({
    type: [String],
    description: "IDs das paradas na nova ordem final (a rota inteira, não só um trecho)",
  })
  @IsUUID("4", { each: true })
  @ArrayUnique()
  @ArrayMinSize(1)
  stopIds!: string[];
}
