import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolStaffRole } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID, Length, MinLength } from "class-validator";

import { IsBrazilianMobile, IsLoginEmail } from "@/common/validators";

/**
 * Criação direta de uma conta do Portal da Escola (pedido do usuário
 * 22/09/2026: "não irei criar escolas... só terminar o quesito de:
 * e-mail e senha. Para os diretores, coordenadores e ajudantes nas
 * escolas poderem acessar").
 *
 * É o caminho DIRETO, sem convite: a escola já existe no catálogo
 * (veio da planilha), então o que falta é só abrir o acesso. O convite
 * por código continua existindo para o fluxo privado — as duas portas
 * convivem.
 *
 * NOTA sobre `telefone`: é pedido porque `User.telefone` é único e
 * obrigatório no banco desde sempre (é um dos três identificadores de
 * login, junto de e-mail e CPF). Afrouxar isso mexeria no login de
 * todos os papéis, o que não cabe dentro deste pedido.
 */
export class CriarContaDaEscolaDto {
  @ApiProperty({ example: "Maria da Silva" })
  @IsString()
  @Length(3, 120)
  nome!: string;

  @ApiProperty({ example: "diretoria@emefjardim.rj.gov.br" })
  @IsLoginEmail()
  email!: string;

  @ApiProperty({
    example: "11987654321",
    description: "Celular com DDD: vira identificador de login e canal de recuperação.",
  })
  /* Era `@Length(10, 15)` num campo que a própria descrição chama de
     identificador de login: "0000000000" passava, e a máscara era
     gravada junto, deixando a conta impossível de abrir. */
  @IsBrazilianMobile()
  telefone!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  senha!: string;

  @ApiProperty({
    enum: SchoolStaffRole,
    description:
      "Cargo na escola. Só `DIRETOR` pode, depois, abrir acesso para os colegas: por isso o Admin da Rotta cria um diretor por escola e o resto nasce de lá.",
  })
  @IsEnum(SchoolStaffRole)
  papel!: SchoolStaffRole;

  @ApiPropertyOptional({
    description:
      "A escola. OBRIGATÓRIO para o Admin da Rotta; PROIBIDO para o diretor: no caso dele, a escola vem do token, senão ele abriria acesso na escola de outra pessoa.",
  })
  @IsOptional()
  @IsUUID()
  escolaId?: string;
}
