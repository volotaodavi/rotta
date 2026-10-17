import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Checklist pré-viagem (briefing "CHECKLIST") — preenchido por quem vai
 * na van, Motorista ou Monitor, sempre com o ator autenticado como
 * autor (Dossiê 13: "nunca o body").
 *
 * Não existe campo de viagem aqui, de propósito. A viagem é a que o
 * veículo tem em andamento no instante da gravação
 * (`Vehicle.viagemAtualId`), ou a que começar em seguida. Deixar o
 * cliente escolher a viagem seria deixar o cliente carimbar um
 * checklist em qualquer viagem de qualquer dia.
 */
export class CreateVehicleChecklistDto {
  @ApiProperty({ default: true }) @IsBoolean() pneusOk!: boolean;
  @ApiProperty({ default: true }) @IsBoolean() lucesOk!: boolean;
  @ApiProperty({ default: true }) @IsBoolean() combustivelOk!: boolean;
  @ApiProperty({ default: true }) @IsBoolean() limpezaOk!: boolean;
  @ApiProperty({ default: true }) @IsBoolean() equipamentosObrigatoriosOk!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;
}
