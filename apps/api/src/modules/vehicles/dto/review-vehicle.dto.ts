import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleAdminReviewStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * `PATCH /vehicles/:id/revisao-admin` (Admin Rotta) — pedido do usuário:
 * uma camada ADICIONAL de aprovação/reprovação sobre o "pré-aprovado" já
 * existente (qualquer veículo roda normalmente assim que a identidade é
 * verificada). `status` só aceita `APROVADO`/`REPROVADO` — `PRE_APROVADO`
 * é o estado automático de todo veículo novo, nunca uma decisão manual
 * (validado no service, não aqui, pra manter a mensagem de erro clara).
 *
 * Dois textos SEPARADOS, nunca reaproveitados um pro outro (pedido
 * explícito do usuário): `observacaoResponsaveis` é mostrada aos
 * responsáveis (via "Li e concordo", nunca com opção de recusar) e
 * `observacaoTransportadora` é mostrada só à empresa dona do veículo.
 * Motivo obrigatório só ao reprovar (mesma regra de
 * `DecideIdentityVerificationDto` — "ele é mostrado diretamente para o
 * usuário").
 */
export class ReviewVehicleDto {
  @ApiProperty({ enum: VehicleAdminReviewStatus, enumName: "APROVADO | REPROVADO" })
  @IsEnum(VehicleAdminReviewStatus)
  status!: VehicleAdminReviewStatus;

  @ApiPropertyOptional({ maxLength: 1000, description: "Texto mostrado aos responsáveis" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacaoResponsaveis?: string;

  @ApiPropertyOptional({ maxLength: 1000, description: "Texto mostrado só à transportadora" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacaoTransportadora?: string;
}
