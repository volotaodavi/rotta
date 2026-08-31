import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { StudentAddressOverrideTrecho } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import { IsCep } from "@/common/validators";

/**
 * Frente 10(b) — endereço alternativo RECORRENTE (pedido do usuário:
 * "mudança de endereço... na ocasionalidade ele pode escolher os dias
 * que pode mudar"), ao lado de `CreateStudentAddressOverrideDto` (dia
 * único avulso). Mesma exigência de endereço confirmado no mapa
 * (`latitude`/`longitude` obrigatórias) — sem `localTipo`/
 * `horarioAlternativo` (Frente 10(c), exclusivo do desvio de dia
 * único: "embarque adiado" é por natureza um evento pontual, não uma
 * regra recorrente).
 */
export class CreateStudentAddressOverrideRecurrenceDto {
  @ApiProperty({
    example: [2, 4],
    description: "0=domingo..6=sábado, sem duplicatas. Pelo menos um dia.",
    type: [Number],
  })
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  diasSemana!: number[];

  @ApiProperty({ example: "2026-09-01", description: "Início da vigência (YYYY-MM-DD)." })
  @IsDateString()
  vigenciaInicio!: string;

  @ApiPropertyOptional({
    example: "2026-12-15",
    description: "Fim da vigência (YYYY-MM-DD); ausente = por tempo indeterminado.",
  })
  @IsOptional()
  @IsDateString()
  vigenciaFim?: string;

  @ApiProperty({ enum: StudentAddressOverrideTrecho, example: StudentAddressOverrideTrecho.AMBOS })
  @IsEnum(StudentAddressOverrideTrecho)
  trecho!: StudentAddressOverrideTrecho;

  @ApiProperty({ example: "01310100" })
  @IsCep()
  cep!: string;

  @ApiProperty({ example: "Avenida Paulista" })
  @IsString()
  @MaxLength(200)
  logradouro!: string;

  @ApiProperty({ example: "1000" })
  @IsString()
  @MaxLength(20)
  numero!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  complemento?: string;

  @ApiProperty({ example: "Bela Vista" })
  @IsString()
  @MaxLength(120)
  bairro!: string;

  @ApiProperty({ example: "São Paulo" })
  @IsString()
  @MaxLength(120)
  cidade!: string;

  @ApiProperty({ example: "SP", minLength: 2, maxLength: 2 })
  @IsString()
  @Length(2, 2)
  estado!: string;

  @ApiProperty({ example: -23.561684 })
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -46.655981 })
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({ example: "Fica na casa do pai às terças e quintas." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacao?: string;
}
