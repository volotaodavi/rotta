import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

import { IsBrazilianMobile } from "@/common/validators";

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

  @ApiProperty({ example: "11988887777" })
  /* Era `@MinLength(10) @MaxLength(20)`: "0000000000" passava, e um
     fixo também. Este número é a chave que a família vai usar para se
     achar no pré-cadastro, e quem digita não é ela. */
  @IsBrazilianMobile()
  celularResponsavel!: string;
}
