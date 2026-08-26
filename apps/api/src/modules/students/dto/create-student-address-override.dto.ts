import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { StudentAddressOverrideTrecho } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from "class-validator";

import { IsCep } from "@/common/validators";

/**
 * Desvio de endereço de um dia específico (pedido do usuário: "o
 * responsável pode informar se algum dia ele irá para outro endereço —
 * na ida, na volta ou ambos"). Mesmo desenho de campos de
 * `CreateStudentDto` (endereço completo + coordenadas), mas
 * `latitude`/`longitude` são OBRIGATÓRIAS aqui (diferente do cadastro
 * permanente do aluno): o desvio nasce sempre de um pino confirmado no
 * mapa pelo Responsável, nunca de um endereço "no escuro" — a linha azul
 * e o cálculo de rota do dia dependem de coordenada real desde o início.
 */
export class CreateStudentAddressOverrideDto {
  @ApiProperty({ example: "2026-09-01", description: "Dia em que o desvio vale (YYYY-MM-DD)." })
  @IsDateString()
  data!: string;

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

  @ApiPropertyOptional({ example: "Vou estar na casa da minha avó nesse dia." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacao?: string;
}
