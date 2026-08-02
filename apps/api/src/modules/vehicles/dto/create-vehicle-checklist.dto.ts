import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

/** Checklist opcional pré-viagem (briefing "CHECKLIST") — sempre feito pelo motorista logado. */
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

  @ApiPropertyOptional({ description: "Referência da viagem (Trips ainda não existe)" })
  @IsOptional()
  @IsString()
  viagemId?: string;
}
