import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleOccurrenceSeverity } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

/** Ocorrência/incidente reportado pelo app mobile (briefing "APP MOBILE" — "Ocorrências"). */
export class CreateVehicleOccurrenceDto {
  @ApiProperty({ example: "Pneu furado" })
  @IsString()
  @MaxLength(160)
  titulo!: string;

  @ApiProperty({ example: "Pneu dianteiro direito furou durante a rota da manhã." })
  @IsString()
  @MaxLength(2000)
  descricao!: string;

  @ApiPropertyOptional({
    enum: VehicleOccurrenceSeverity,
    default: VehicleOccurrenceSeverity.MEDIA,
  })
  @IsOptional()
  @IsEnum(VehicleOccurrenceSeverity)
  severidade?: VehicleOccurrenceSeverity;

  @ApiPropertyOptional({ type: [String], description: "URLs de fotos já enviadas ao Storage" })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  fotoUrls?: string[];
}
