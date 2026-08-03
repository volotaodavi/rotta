import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RatingTargetType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

/**
 * Avaliação pós-transporte (briefing "AVALIAÇÕES" — liberada 30 dias
 * após a ativação do contrato). `alvoId` NUNCA vem do cliente — é
 * resolvido por `RatingsService` a partir do próprio `Contract`
 * (`motoristaId`/`monitorId`/`vehicleId`/`companyId`, conforme
 * `alvoTipo`), para que o Responsável só possa avaliar quem de fato
 * prestou o serviço em SEU contrato.
 */
export class CreateRatingDto {
  @ApiProperty({ enum: RatingTargetType })
  @IsEnum(RatingTargetType)
  alvoTipo!: RatingTargetType;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  nota!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
