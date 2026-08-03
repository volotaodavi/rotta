import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContractStatus } from "@prisma/client";

/** Contrato (briefing "CONTRATO"/"TRANSPORTE ATIVO"). */
export class ContractResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() transportRequestId!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() responsavelId!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() schoolId!: string;

  @ApiPropertyOptional() vehicleId?: string | null;
  @ApiPropertyOptional() motoristaId?: string | null;
  @ApiPropertyOptional() monitorId?: string | null;

  @ApiProperty() valorMensalidadeCentavos!: number;
  @ApiProperty() planoDescricao!: string;
  @ApiProperty() regras!: string;
  @ApiProperty() vigenciaInicio!: Date;
  @ApiPropertyOptional() vigenciaFim?: Date | null;

  @ApiProperty({ enum: ContractStatus }) status!: ContractStatus;

  @ApiPropertyOptional() authentiqueDocumentId?: string | null;
  @ApiPropertyOptional() assinadoResponsavelEm?: Date | null;
  @ApiPropertyOptional() assinadoEmpresaEm?: Date | null;
  @ApiPropertyOptional() ativadoEm?: Date | null;
  @ApiPropertyOptional() encerradoEm?: Date | null;

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListContractsResponseDto {
  @ApiProperty({ type: [ContractResponseDto] }) items!: ContractResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
