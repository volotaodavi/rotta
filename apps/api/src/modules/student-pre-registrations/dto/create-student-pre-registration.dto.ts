import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

/**
 * Pré-cadastro de aluno feito pela transportadora (pedido do usuário:
 * "cadastrar alunos por transporte + responsável (nome do aluno, nome do
 * responsável + número do celular responsável)"). `celularResponsavel`
 * aceita qualquer formatação (com/sem DDD, com/sem +55) — normalizado
 * (só dígitos) em `StudentPreRegistrationsService.normalizeCelular` antes
 * de salvar, pra bater depois com o que o Responsável digitar.
 */
export class CreateStudentPreRegistrationDto {
  @ApiProperty({ example: "Lucas Silva" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nomeAluno!: string;

  @ApiProperty({ example: "Ana Silva" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nomeResponsavel!: string;

  @ApiProperty({ example: "(11) 98888-7777" })
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  celularResponsavel!: string;
}
