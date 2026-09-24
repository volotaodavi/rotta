import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Uma escala do dia, já com os nomes resolvidos.
 *
 * Traz nome de rota, número do ônibus e nome do motorista porque a tela
 * do despachante é uma grade de conferência — mostrar UUID ali seria
 * inútil, e obrigar o front a fazer três consultas extras por linha
 * seria pior.
 */
export class EscalaResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "2026-09-25" })
  data!: string;

  @ApiProperty()
  routeId!: string;

  @ApiProperty({ example: "Rota Centro" })
  rotaNome!: string;

  @ApiProperty({ example: "MANHA" })
  rotaTurno!: string;

  @ApiProperty()
  veiculoId!: string;

  @ApiProperty({
    example: "412",
    description: "Número do ônibus. Cai para a placa quando a frota não usa numeração.",
  })
  veiculoIdentificacao!: string;

  @ApiProperty()
  motoristaId!: string;

  @ApiProperty()
  motoristaNome!: string;

  @ApiPropertyOptional({ nullable: true })
  monitorId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  monitorNome!: string | null;

  @ApiPropertyOptional({ nullable: true })
  observacao!: string | null;
}
