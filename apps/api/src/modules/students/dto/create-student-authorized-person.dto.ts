import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string;

  @ApiPropertyOptional({ example: "Avó" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  parentesco?: string;
}
