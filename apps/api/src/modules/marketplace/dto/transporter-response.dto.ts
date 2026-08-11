import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyType, VehicleCategory, VehicleType } from "@prisma/client";

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

  @ApiProperty({
    enum: VehicleCategory,
    isArray: true,
    description:
      "Modalidades da frota ativa (Dossiê 45 — CATEGORIA B ≠ TRANSPORTE ESCOLAR): ESCOLAR só aparece aqui quando a empresa tem pelo menos 1 veículo ativo declarado nessa categoria — nunca inferido da categoria da CNH de um motorista.",
  })
  categoriasVeiculo!: VehicleCategory[];

  @ApiProperty({
    description:
      "Dossiê 45, achado C1 da auditoria de consistência Legal↔Produto: true somente quando a empresa tem ao menos 1 veículo ativo declarado ESCOLAR cujo motorista atualmente vinculado passa em `computeSchoolTransportEligibility` (CNH D/E + EAR + curso + antecedentes, todos verificados) — nunca apenas a categoria do veículo declarada pela empresa (`categoriasVeiculo` acima). Uma transportadora pode ter `categoriasVeiculo` incluindo ESCOLAR e `escolarVerificado: false` ao mesmo tempo.",
  })
  escolarVerificado!: boolean;

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

class PublicSchoolLinkDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nomeOficial!: string;
}

class PublicTeamMemberDto {
  @ApiProperty()
  nome!: string;

  @ApiProperty({ description: '"motorista" ou "monitor" (valor de `Role`, Dossie 8 Secao 2)' })
  papel!: string;
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

  @ApiProperty({
    description: 'Data de cadastro da empresa na Rotta — base de "atuando há X anos"',
  })
  atuandoDesde!: Date;

  @ApiProperty({
    type: [PublicSchoolLinkDto],
    description: 'Escolas com vínculo ativo — perfil público (briefing "PERFIL DA EMPRESA")',
  })
  escolasAtendidas!: PublicSchoolLinkDto[];

  @ApiProperty({
    type: [PublicTeamMemberDto],
    description: "Motoristas/monitores ativos — só nome e papel, nunca dado pessoal sensível",
  })
  equipe!: PublicTeamMemberDto[];

  @ApiPropertyOptional({
    description:
      "Média de horas entre o envio e a decisão (aprovada/recusada) de solicitações — null se a empresa ainda não decidiu nenhuma",
  })
  tempoMedioRespostaHoras!: number | null;
}
