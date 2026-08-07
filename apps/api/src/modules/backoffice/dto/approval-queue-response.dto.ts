import { ApiProperty } from "@nestjs/swagger";

export class PendingDriverDocumentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() companyNome!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() userNome!: string;
  @ApiProperty() tipo!: string;
  @ApiProperty() rottaAiStatus!: string;
  @ApiProperty() createdAt!: Date;
}

export class PendingVehicleDocumentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() companyNome!: string;
  @ApiProperty() vehicleId!: string;
  @ApiProperty() vehiclePlaca!: string;
  @ApiProperty() tipo!: string;
  @ApiProperty() rottaAiStatus!: string;
  @ApiProperty() createdAt!: Date;
}

export class PendingContractResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() companyNome!: string;
  @ApiProperty() studentNome!: string;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: Date;
}

/**
 * Central de Aprovações (Prompt 21) — une, em uma única resposta, os 3
 * tipos de item que hoje já carregam um estado "pendente de revisão"
 * (`DriverDocument.rottaAiStatus`, `VehicleDocument.rottaAiStatus`,
 * `Contract.status = AGUARDANDO_ASSINATURA`). Não é uma fila
 * cross-entidade paginada em conjunto — cada categoria pagina/lista
 * separadamente (`limitPerCategoria`), o suficiente para o painel
 * inicial; ver Dossiê 29 §"Plano de evolução" para uma fila unificada
 * com ação de aprovar/reprovar em lote.
 */
export class ApprovalQueueResponseDto {
  @ApiProperty({ type: [PendingDriverDocumentResponseDto] })
  documentosMotorista!: PendingDriverDocumentResponseDto[];

  @ApiProperty({ type: [PendingVehicleDocumentResponseDto] })
  documentosVeiculo!: PendingVehicleDocumentResponseDto[];

  @ApiProperty({ type: [PendingContractResponseDto] })
  contratos!: PendingContractResponseDto[];
}
