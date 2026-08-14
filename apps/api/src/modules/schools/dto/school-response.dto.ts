import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  SchoolAdministrativeDependency,
  SchoolShift,
  SchoolStatus,
  SchoolType,
} from "@prisma/client";

/** Forma de resposta pública de `School` (briefing "CADASTRO"/"ENDEREÇO"/"TIPOS"/"STATUS"). */
export class SchoolResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() codigoInterno!: string;
  @ApiPropertyOptional() codigoInep?: string | null;
  @ApiProperty() nomeOficial!: string;
  @ApiPropertyOptional() nomeFantasia?: string | null;
  @ApiPropertyOptional() redeEnsino?: string | null;
  @ApiProperty({ enum: SchoolAdministrativeDependency })
  dependenciaAdministrativa!: SchoolAdministrativeDependency;
  @ApiPropertyOptional() cnpj?: string | null;
  @ApiPropertyOptional() telefone?: string | null;
  @ApiPropertyOptional() whatsapp?: string | null;
  @ApiPropertyOptional() email?: string | null;
  @ApiPropertyOptional() website?: string | null;

  @ApiProperty() cep!: string;
  @ApiProperty() logradouro!: string;
  @ApiProperty() numero!: string;
  @ApiPropertyOptional() complemento?: string | null;
  @ApiProperty() bairro!: string;
  @ApiProperty() cidade!: string;
  @ApiProperty() estado!: string;
  @ApiProperty() pais!: string;
  @ApiPropertyOptional() latitude?: number | null;
  @ApiPropertyOptional() longitude?: number | null;
  @ApiPropertyOptional() observacoesLocalizacao?: string | null;

  @ApiProperty({ enum: SchoolType, isArray: true }) tipos!: SchoolType[];
  @ApiProperty({ enum: SchoolShift, isArray: true }) turnosAtendidos!: SchoolShift[];
  @ApiProperty({ enum: SchoolStatus }) status!: SchoolStatus;
  @ApiProperty() origemCadastro!: string;
  @ApiPropertyOptional() criadoPorId?: string | null;

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListSchoolsResponseDto {
  @ApiProperty({ type: [SchoolResponseDto] }) items!: SchoolResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

/** Uma sugestão do autocomplete tolerante a erro de digitação (`GET /schools/sugestoes`). */
export class SchoolSuggestionResponseDto extends SchoolResponseDto {
  @ApiPropertyOptional({
    description:
      "Distância em km até a latitude/longitude informada na busca — null quando a busca não informou localização ou a escola ainda não tem coordenada confirmada.",
  })
  distanciaKm?: number | null;
}

export class SuggestSchoolsResponseDto {
  @ApiProperty({ type: [SchoolSuggestionResponseDto] }) items!: SchoolSuggestionResponseDto[];
}
