import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolShift, TransportRequestStatus } from "@prisma/client";

/**
 * Solicitação de transporte (briefing "SOLICITAÇÃO"). Achado real
 * (pedido do usuário: "tá dando erro ao ver quem solicitou o
 * transporte"): a Empresa/Gestor via só os UUIDs crus de
 * `studentId`/`responsavelId`/`schoolId` — impossível de fato "ver quem
 * solicitou" com isso na tela. Os campos `*Nome`/`responsavelTelefone`
 * abaixo são opcionais (o `create`/`updateStatus` do repositório não
 * fazem join, só as leituras — `findByIdScoped`/`findById`/`list` —
 * precisam, e são as únicas realmente renderizadas nas telas).
 */
export class TransportRequestResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiPropertyOptional() studentNome?: string;
  @ApiProperty() responsavelId!: string;
  @ApiPropertyOptional() responsavelNome?: string;
  @ApiPropertyOptional() responsavelTelefone?: string;
  @ApiProperty() companyId!: string;
  @ApiPropertyOptional() companyNome?: string;
  @ApiProperty() schoolId!: string;
  @ApiPropertyOptional() schoolNome?: string;
  @ApiProperty({ enum: SchoolShift }) turno!: SchoolShift;

  @ApiProperty({ enum: TransportRequestStatus }) status!: TransportRequestStatus;
  @ApiPropertyOptional() motivoRecusa?: string | null;

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListTransportRequestsResponseDto {
  @ApiProperty({ type: [TransportRequestResponseDto] }) items!: TransportRequestResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
