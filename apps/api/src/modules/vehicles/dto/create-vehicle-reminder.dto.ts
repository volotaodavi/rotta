import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleReminderType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, MaxLength } from "class-validator";

/** Lembrete manual (briefing "LEMBRETES") — revisão/troca de óleo/manutenção preventiva. */
export class CreateVehicleReminderDto {
  @ApiProperty({ enum: VehicleReminderType, example: VehicleReminderType.REVISAO })
  @IsEnum(VehicleReminderType)
  tipo!: VehicleReminderType;

  @ApiProperty({ example: "2026-09-01" })
  @IsDateString()
  dataAlvo!: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quilometragemAlvo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;
}
