import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  VehicleAdminReviewStatus,
  VehicleCategory,
  VehicleCategoryOrigin,
  VehicleCategoryReviewStatus,
  VehicleStatus,
  VehicleType,
} from "@prisma/client";

/** Forma de resposta pública de `Vehicle` (briefing "CADASTUR"/"STATUS"/"LOCALIZAÇÃO"). */
export class VehicleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() placa!: string;
  @ApiProperty() modelo!: string;
  @ApiPropertyOptional() marca?: string | null;
  @ApiPropertyOptional() ano?: number | null;
  @ApiPropertyOptional() cor?: string | null;
  @ApiPropertyOptional() renavam?: string | null;
  @ApiPropertyOptional() chassi?: string | null;
  @ApiProperty() capacidadePassageiros!: number;
  @ApiProperty({ enum: VehicleType }) tipo!: VehicleType;
  @ApiProperty({ enum: VehicleCategory }) categoria!: VehicleCategory;
  @ApiProperty({
    enum: VehicleCategoryOrigin,
    description:
      "Se a categoria veio de escolha manual da empresa ou de sugestão da IA (Frente AL)",
  })
  categoriaOrigem!: VehicleCategoryOrigin;
  @ApiProperty({
    enum: VehicleCategoryReviewStatus,
    description: "PENDENTE quando a confiança da IA foi baixa e aguarda revisão de um Admin Rotta",
  })
  categoriaRevisaoStatus!: VehicleCategoryReviewStatus;
  @ApiPropertyOptional({ description: "0-100 — só preenchido quando categoriaOrigem = IA" })
  categoriaConfiancaIa?: number | null;
  @ApiPropertyOptional({ description: "Motivo legível da sugestão da IA" })
  categoriaMotivoIa?: string | null;
  @ApiPropertyOptional() categoriaRevisadaPorId?: string | null;
  @ApiPropertyOptional() categoriaRevisadaEm?: Date | null;
  @ApiPropertyOptional() observacoes?: string | null;
  @ApiPropertyOptional() fotoUrl?: string | null;
  @ApiProperty({ enum: VehicleStatus }) status!: VehicleStatus;
  @ApiProperty({
    enum: VehicleAdminReviewStatus,
    description:
      "Aprovação/reprovação do Admin Rotta (camada adicional — todo veículo nasce PRE_APROVADO)",
  })
  revisaoAdminStatus!: VehicleAdminReviewStatus;
  @ApiPropertyOptional({ description: "Observação mostrada aos responsáveis (Li e concordo)" })
  revisaoAdminObservacaoResponsaveis?: string | null;
  @ApiPropertyOptional({ description: "Observação mostrada só à transportadora" })
  revisaoAdminObservacaoTransportadora?: string | null;
  @ApiPropertyOptional() revisaoAdminDecididoPorId?: string | null;
  @ApiPropertyOptional() revisaoAdminDecididoEm?: Date | null;
  @ApiProperty() quilometragemAtual!: number;
  @ApiPropertyOptional() ultimaLatitude?: number | null;
  @ApiPropertyOptional() ultimaLongitude?: number | null;
  @ApiPropertyOptional() ultimaPosicaoEm?: Date | null;
  @ApiPropertyOptional() viagemAtualId?: string | null;
  @ApiPropertyOptional() ultimoMotoristaId?: string | null;
  @ApiPropertyOptional() ultimoMonitorId?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListVehiclesResponseDto {
  @ApiProperty({ type: [VehicleResponseDto] }) items!: VehicleResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
