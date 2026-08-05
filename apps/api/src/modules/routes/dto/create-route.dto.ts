import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RouteWeekday, SchoolShift } from "@prisma/client";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

/** Cadastro de Rota (ROT-01) — sempre pertence ao tenant do ator autenticado. */
export class CreateRouteDto {
  @ApiProperty({ example: "Rota Manhã — Zona Norte" })
  @IsString()
  @MaxLength(120)
  nome!: string;

  @ApiProperty({ enum: SchoolShift, example: SchoolShift.MANHA })
  @IsEnum(SchoolShift)
  turno!: SchoolShift;

  @ApiProperty({ enum: RouteWeekday, isArray: true, example: [RouteWeekday.SEGUNDA] })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(RouteWeekday, { each: true })
  diasSemana!: RouteWeekday[];

  @ApiPropertyOptional({
    description: "Veículo padrão desta rota (pode ser substituído por viagem)",
  })
  @IsOptional()
  @IsUUID()
  veiculoPadraoId?: string;

  @ApiPropertyOptional({
    description: "Motorista padrão desta rota (pode ser substituído por viagem)",
  })
  @IsOptional()
  @IsUUID()
  motoristaPadraoId?: string;

  @ApiPropertyOptional({
    description: "Monitor padrão desta rota (pode ser substituído por viagem)",
  })
  @IsOptional()
  @IsUUID()
  monitorPadraoId?: string;
}
