import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from "class-validator";

/**
 * Um "ping" de GPS (GPS-03). `capturadaEm` é sempre o timestamp gerado
 * NO DISPOSITIVO — essencial para a fila offline (GPS-04, app mobile —
 * ainda não implementada): quando o motorista sincroniza um lote
 * acumulado sem sinal, é este campo (não o momento em que o servidor
 * recebeu) que preserva a ordem real do trajeto.
 */
export class IngestPositionDto {
  @ApiProperty({ example: -23.561684 })
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -46.655981 })
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({ example: 12.5, description: "Precisão do GPS em metros" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precisaoMetros?: number;

  @ApiPropertyOptional({ example: 35.2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  velocidadeKmh?: number;

  @ApiProperty({ description: "Timestamp ISO 8601 gerado no dispositivo no momento da captura" })
  @IsISO8601()
  capturadaEm!: string;

  @ApiPropertyOptional({
    description: "Sinalizado pelo cliente quando detecta mock/simulação de localização",
  })
  @IsOptional()
  @IsBoolean()
  simuladoSuspeito?: boolean;
}

/** Ingestão em lote (GPS-04 — reconciliação da fila offline do app mobile). */
export class IngestPositionsBatchDto {
  @ApiProperty({ type: [IngestPositionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IngestPositionDto)
  posicoes!: IngestPositionDto[];
}
