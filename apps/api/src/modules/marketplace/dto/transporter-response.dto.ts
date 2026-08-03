import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyType, VehicleType } from "@prisma/client";

/** Cartão de transportador na busca (briefing "Marketplace" §"TRANSPORTADORES"). */
export class TransporterCardResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nomeFantasia!: string;

  @ApiPropertyOptional()
  logoUrl?: string | null;

  @ApiProperty({ enum: CompanyType })
  tipo!: CompanyType;

  @ApiProperty({ description: "Selo Transportador Verificado — ver `verification.util.ts`" })
  verificado!: boolean;

  @ApiPropertyOptional({ description: "Distância até o ponto de busca, em km" })
  distanciaKm!: number;

  @ApiPropertyOptional({
    description: "Média das avaliações recebidas (1-5) — null se ainda não avaliado",
  })
  avaliacaoMedia!: number | null;

  @ApiProperty()
  totalAvaliacoes!: number;

  @ApiProperty()
  veiculosAtivos!: number;

  @ApiProperty({ enum: VehicleType, isArray: true })
  tiposVeiculo!: VehicleType[];

  @ApiProperty()
  alunosTransportados!: number;

  @ApiPropertyOptional({
    description:
      "Menor mensalidade entre contratos ativos, em centavos — null se ainda não tem contrato ativo",
  })
  mensalidadeAPartirDeCentavos!: number | null;
}

export class ListTransportersResponseDto {
  @ApiProperty({ type: [TransporterCardResponseDto] })
  items!: TransporterCardResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

class RecentRatingDto {
  @ApiProperty()
  nota!: number;

  @ApiPropertyOptional()
  comentario?: string | null;

  @ApiProperty()
  responsavelNome!: string;

  @ApiProperty()
  createdAt!: Date;
}

/** Página de detalhes do transportador (briefing "DETALHES"). */
export class TransporterDetailResponseDto extends TransporterCardResponseDto {
  @ApiProperty()
  razaoSocial!: string;

  @ApiProperty()
  cidade!: string;

  @ApiProperty()
  estado!: string;

  @ApiPropertyOptional()
  telefone?: string;

  @ApiPropertyOptional()
  whatsapp?: string | null;

  @ApiPropertyOptional()
  fotoUrl?: string | null;

  @ApiProperty({ type: [RecentRatingDto] })
  avaliacoesRecentes!: RecentRatingDto[];
}
