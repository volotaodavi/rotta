import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min, MaxLength } from "class-validator";

/**
 * Geração de contrato (briefing "CONTRATO") — só a partir de uma
 * `TransportRequest` já `APROVADA` (`ContractsService.gerarContrato`).
 * `vehicleId`/`motoristaId`/`monitorId` são opcionais na geração: podem
 * ser atribuídos depois, mesmo raciocínio de `Vehicle.ultimoMotoristaId`
 * (ver nota no model `Contract`, schema.prisma).
 */
export class CreateContractDto {
  @ApiProperty({ example: 35000, description: "Valor da mensalidade em centavos" })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  valorMensalidadeCentavos!: number;

  @ApiProperty({ example: "Plano mensal — ida e volta, 2 turnos" })
  @IsString()
  @MaxLength(500)
  planoDescricao!: string;

  @ApiProperty({ example: "Cancelamento com 30 dias de antecedência." })
  @IsString()
  @MaxLength(2000)
  regras!: string;

  @ApiProperty({ example: "2026-02-01" })
  @IsDateString()
  vigenciaInicio!: string;

  @ApiPropertyOptional({ example: "2026-12-15" })
  @IsOptional()
  @IsDateString()
  vigenciaFim?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  motoristaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  monitorId?: string;
}
