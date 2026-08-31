import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { StudentAddressOverrideLocalTipo, StudentAddressOverrideTrecho } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";

import { IsCep } from "@/common/validators";

/** `localTipo` ausente é implicitamente `OUTRO` (compat com registros anteriores a esta Frente). */
function exigeEnderecoCompleto(dto: CreateStudentAddressOverrideDto): boolean {
  return (
    (dto.localTipo ?? StudentAddressOverrideLocalTipo.OUTRO) ===
    StudentAddressOverrideLocalTipo.OUTRO
  );
}

/**
 * Desvio de endereço de um dia específico (pedido do usuário: "o
 * responsável pode informar se algum dia ele irá para outro endereço —
 * na ida, na volta ou ambos"). Mesmo desenho de campos de
 * `CreateStudentDto` (endereço completo + coordenadas).
 *
 * Frente 10(c) — "embarque adiado" (pedido do usuário: "informar que o
 * aluno não embarcará naquele momento, mas será embarcado em outro
 * momento... horário, ou se ele vai buscar na escola ou em outro
 * local/residência"): `localTipo` decide se `cep`/`logradouro`/...
 * abaixo são obrigatórios. `RESIDENCIA`/`ESCOLA` resolvem pro endereço
 * já cadastrado (do aluno ou da escola vinculada) sem exigir novo pino
 * no mapa; só `OUTRO` (padrão — mesmo comportamento de sempre) exige o
 * endereço completo, que nasce sempre de um pino confirmado no mapa
 * pelo Responsável, nunca de um endereço "no escuro".
 */
export class CreateStudentAddressOverrideDto {
  @ApiProperty({ example: "2026-09-01", description: "Dia em que o desvio vale (YYYY-MM-DD)." })
  @IsDateString()
  data!: string;

  @ApiProperty({ enum: StudentAddressOverrideTrecho, example: StudentAddressOverrideTrecho.AMBOS })
  @IsEnum(StudentAddressOverrideTrecho)
  trecho!: StudentAddressOverrideTrecho;

  @ApiPropertyOptional({
    enum: StudentAddressOverrideLocalTipo,
    default: StudentAddressOverrideLocalTipo.OUTRO,
    description:
      "RESIDENCIA/ESCOLA dispensam o endereço abaixo (resolvido a partir do cadastro); OUTRO exige.",
  })
  @IsOptional()
  @IsEnum(StudentAddressOverrideLocalTipo)
  localTipo?: StudentAddressOverrideLocalTipo;

  @ApiPropertyOptional({
    example: "16:30",
    description:
      'Frente 10(c) — "embarque adiado" a outro horário no mesmo dia (formato "HH:mm"). Ausente = mantém o horário normal da parada.',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "horarioAlternativo deve estar no formato HH:mm",
  })
  horarioAlternativo?: string;

  @ApiPropertyOptional({ example: "01310100" })
  @ValidateIf(exigeEnderecoCompleto)
  @IsCep()
  cep?: string;

  @ApiPropertyOptional({ example: "Avenida Paulista" })
  @ValidateIf(exigeEnderecoCompleto)
  @IsString()
  @MaxLength(200)
  logradouro?: string;

  @ApiPropertyOptional({ example: "1000" })
  @ValidateIf(exigeEnderecoCompleto)
  @IsString()
  @MaxLength(20)
  numero?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  complemento?: string;

  @ApiPropertyOptional({ example: "Bela Vista" })
  @ValidateIf(exigeEnderecoCompleto)
  @IsString()
  @MaxLength(120)
  bairro?: string;

  @ApiPropertyOptional({ example: "São Paulo" })
  @ValidateIf(exigeEnderecoCompleto)
  @IsString()
  @MaxLength(120)
  cidade?: string;

  @ApiPropertyOptional({ example: "SP", minLength: 2, maxLength: 2 })
  @ValidateIf(exigeEnderecoCompleto)
  @IsString()
  @Length(2, 2)
  estado?: string;

  @ApiPropertyOptional({ example: -23.561684 })
  @ValidateIf(exigeEnderecoCompleto)
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: -46.655981 })
  @ValidateIf(exigeEnderecoCompleto)
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ example: "Vou estar na casa da minha avó nesse dia." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacao?: string;
}
