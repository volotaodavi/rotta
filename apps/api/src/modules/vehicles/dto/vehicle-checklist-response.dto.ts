import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** A viagem a que o checklist pertence, só o que identifica a viagem para quem lê. */
export class ChecklistViagemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: "Código legível de 6 caracteres" }) codigo!: string;
  @ApiProperty() data!: Date;
  @ApiProperty({ enum: ["IDA", "VOLTA"] }) sentido!: string;
  @ApiProperty() status!: string;
  @ApiProperty() iniciadaEm!: Date;
  @ApiPropertyOptional() finalizadaEm?: Date | null;
}

export class VehicleChecklistResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() vehicleId!: string;
  @ApiProperty() preenchidoPorId!: string;
  @ApiProperty() preenchidoPorNome!: string;
  @ApiPropertyOptional({ type: ChecklistViagemDto, nullable: true })
  viagem?: ChecklistViagemDto | null;
  @ApiProperty() pneusOk!: boolean;
  @ApiProperty() lucesOk!: boolean;
  @ApiProperty() combustivelOk!: boolean;
  @ApiProperty() limpezaOk!: boolean;
  @ApiProperty() equipamentosObrigatoriosOk!: boolean;
  @ApiPropertyOptional() observacoes?: string | null;
  @ApiProperty() createdAt!: Date;
}

export class ListVehicleChecklistsResponseDto {
  @ApiProperty({ type: [VehicleChecklistResponseDto] }) items!: VehicleChecklistResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

/**
 * O que a tela do Motorista/Monitor precisa saber de uma vez: em que
 * viagem o veículo está, se o checklist dela já foi feito, e o
 * informativo da viagem anterior.
 *
 * `atual = null` é o "reinicia para zero" que o usuário pediu, e ele é
 * consequência, não limpeza: acabou a viagem, não existe mais checklist
 * atual, o formulário volta em branco.
 */
export class ChecklistDoCicloResponseDto {
  @ApiPropertyOptional({
    type: ChecklistViagemDto,
    nullable: true,
    description: "Viagem em andamento/pausada deste veículo, se houver",
  })
  viagemAtual?: ChecklistViagemDto | null;

  @ApiPropertyOptional({
    type: VehicleChecklistResponseDto,
    nullable: true,
    description: "Checklist deste ciclo (da viagem atual, ou o pré-viagem ainda sem viagem)",
  })
  atual?: VehicleChecklistResponseDto | null;

  @ApiPropertyOptional({
    type: VehicleChecklistResponseDto,
    nullable: true,
    description: "Checklist da viagem anterior — informativo, nunca editável",
  })
  anterior?: VehicleChecklistResponseDto | null;
}
