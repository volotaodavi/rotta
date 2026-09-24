import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

/**
 * Designa ônibus, motorista e monitor para uma rota num dia (pedido do
 * usuário 24/09/2026: "a cada dia que for trabalhar, o despachante
 * poderá designar os veículos para rotas, colocando respectivamente os
 * motoristas").
 *
 * É upsert por `[routeId, data]`: mandar de novo a mesma rota no mesmo
 * dia EDITA a escala, nunca cria uma segunda. É assim que o despachante
 * troca o motorista de última hora — o gesto é o mesmo.
 */
export class DefinirEscalaDto {
  @ApiProperty()
  @IsUUID()
  routeId!: string;

  @ApiProperty({ example: "2026-09-25", description: "Dia da escala, `AAAA-MM-DD`." })
  @IsDateString()
  data!: string;

  @ApiProperty()
  @IsUUID()
  veiculoId!: string;

  @ApiProperty()
  @IsUUID()
  motoristaId!: string;

  @ApiPropertyOptional({ description: "Monitor é opcional na operação — a escala vale sem ele." })
  @IsOptional()
  @IsUUID()
  monitorId?: string;

  @ApiPropertyOptional({ description: "Nota do despachante, ex.: 'cobrindo férias do João'." })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  observacao?: string;
}
