import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

import { IsBrazilianPhone } from "@/common/validators";

/** Pessoa autorizada a buscar/acompanhar o aluno (briefing "CADASTRO DO ALUNO" — opcional). */
export class CreateStudentAuthorizedPersonDto {
  @ApiProperty({ example: "Ana Souza (avó)" })
  @IsString()
  @MaxLength(160)
  nome!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cpf?: string;

  @ApiPropertyOptional({ example: "11987654321" })
  @IsOptional()
  /* Quem busca a criança na escola é chamado por telefone quando algo
     foge do combinado. `@MaxLength(20)` aceitava qualquer coisa. */
  @IsBrazilianPhone()
  telefone?: string;

  @ApiPropertyOptional({ example: "Avó" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  parentesco?: string;
}
