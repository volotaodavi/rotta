import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

/**
 * Início de viagem (GPS-01) — `veiculoId`/`monitorId` são opcionais
 * porque, na ausência de substituição, a rota já define um padrão
 * (`Route.veiculoPadraoId`/`monitorPadraoId`); `motoristaId` só é
 * necessário quando quem inicia NÃO é o próprio motorista (ex. um
 * Gestor abrindo a viagem em nome dele) — quando o ator autenticado É
 * `Role.MOTORISTA`, o próprio ator é sempre o motorista da viagem.
 */
export class StartTripDto {
  @ApiProperty()
  @IsUUID()
  routeId!: string;

  @ApiPropertyOptional({ description: "Substitui o veículo padrão da rota, se informado" })
  @IsOptional()
  @IsUUID()
  veiculoId?: string;

  @ApiPropertyOptional({ description: "Obrigatório quando quem inicia não é o próprio motorista" })
  @IsOptional()
  @IsUUID()
  motoristaId?: string;

  @ApiPropertyOptional({ description: "Substitui o monitor padrão da rota, se informado" })
  @IsOptional()
  @IsUUID()
  monitorId?: string;
}
