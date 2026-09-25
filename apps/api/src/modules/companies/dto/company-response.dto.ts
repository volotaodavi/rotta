import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyStatus, CompanyType } from "@prisma/client";

export class PlanResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() priceCents!: number;
}

/** Forma de resposta pública de `Company` — nunca expõe `planId` cru, sempre o `plan` resolvido. */
export class CompanyResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({
    description:
      "Código único da transportadora (Frente M) — o Responsável informa este código no Marketplace para solicitar transporte diretamente, sem precisar buscar por proximidade/escola.",
  })
  codigoInterno!: string;
  @ApiProperty() razaoSocial!: string;
  @ApiProperty() nomeFantasia!: string;
  @ApiProperty() cpfCnpj!: string;
  @ApiProperty({ enum: CompanyType }) tipo!: CompanyType;
  @ApiProperty() email!: string;
  @ApiProperty() telefone!: string;
  @ApiPropertyOptional() whatsapp?: string | null;
  @ApiProperty() cep!: string;
  @ApiProperty() endereco!: string;
  @ApiProperty() numero!: string;
  @ApiPropertyOptional() complemento?: string | null;
  @ApiProperty() bairro!: string;
  @ApiProperty() cidade!: string;
  @ApiProperty() estado!: string;
  @ApiPropertyOptional() latitude?: number | null;
  @ApiPropertyOptional() longitude?: number | null;
  @ApiPropertyOptional() logoUrl?: string | null;
  @ApiPropertyOptional() fotoUrl?: string | null;
  @ApiProperty() corPrimaria!: string;
  @ApiProperty() idioma!: string;
  @ApiProperty() fusoHorario!: string;
  @ApiProperty({ enum: CompanyStatus }) status!: CompanyStatus;
  @ApiProperty({ type: PlanResponseDto }) plan!: PlanResponseDto;
  @ApiPropertyOptional({
    description:
      "Quando o trial de 1 mês grátis vence (Dossiê 26) — `null` em empresas já `ATIVO`/administrativas ou criadas antes deste campo existir. Base do painel de controle de planos do Admin (dias restantes/expirado há N dias).",
  })
  trialExpiraEm?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListCompaniesResponseDto {
  @ApiProperty({ type: [CompanyResponseDto] }) items!: CompanyResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
