import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { SessionResponseDto } from "./session-response.dto";

/** Um vínculo (Membership) do usuário, incluído na exportação de dados (Dossiê 33, LGPD art. 18 V — portabilidade). */
export class DataExportMembershipDto {
  @ApiProperty() empresaId!: string;
  @ApiProperty() empresaNome!: string;
  @ApiProperty() papel!: string;
  @ApiProperty() status!: string;
  @ApiProperty() iniciadoEm!: Date;
  @ApiPropertyOptional() encerradoEm?: Date | null;
}

/** Identidade do usuário, incluída na exportação — nunca inclui `passwordHash`. */
export class DataExportUsuarioDto {
  @ApiProperty() id!: string;
  @ApiProperty() nome!: string;
  @ApiProperty() email!: string;
  @ApiProperty() telefone!: string;
  @ApiProperty() cpf!: string;
  @ApiPropertyOptional() avatarUrl?: string | null;
  @ApiProperty() criadoEm!: Date;
  @ApiPropertyOptional() consentimentoLgpdAceitoEm?: Date | null;
}

/**
 * Exportação autoatendida dos dados pessoais do próprio usuário
 * (Dossiê 33 — Prompt 23, ferramental LGPD; LGPD art. 18 incisos II/V —
 * confirmação de tratamento e portabilidade). `GET /auth/me/data-export`.
 *
 * Escopo desta entrega, deliberadamente: identidade (User) + vínculos
 * (Membership) + sessões ativas — os dados que o próprio módulo Auth já
 * possui. NÃO inclui ainda dado de outros módulos (alunos cadastrados,
 * documentos de motorista/veículo enviados, histórico de viagens,
 * chamados de suporte) — cada um exigiria integrar aquele módulo aqui,
 * fora do escopo real fechado desta entrega. Ver Dossiê 33 §... para o
 * plano de evolução (agregador cross-módulo).
 */
export class DataExportResponseDto {
  @ApiProperty() geradoEm!: Date;
  @ApiProperty({ type: DataExportUsuarioDto }) usuario!: DataExportUsuarioDto;
  @ApiProperty({ type: [DataExportMembershipDto] }) vinculos!: DataExportMembershipDto[];
  @ApiProperty({ type: [SessionResponseDto] }) sessoesAtivas!: SessionResponseDto[];
  @ApiProperty() escopo!: string;
}
