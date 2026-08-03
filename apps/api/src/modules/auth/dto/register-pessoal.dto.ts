import { ApiProperty } from "@nestjs/swagger";
import { Equals, IsBoolean, IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";

import { IsBrazilianPhone, IsCpf, IsStrongPassword } from "@/common/validators";

/**
 * Cadastro self-service da Área Pessoal (briefing "Marketplace" —
 * Responsável) — cria diretamente um `User` com `isResponsavel: true`,
 * SEM `Company`/`Membership` (identidade global, mesmo mecanismo de
 * `isAdminRotta`; ver nota em `User`, `schema.prisma`). Bem mais simples
 * que `RegisterEmpresaDto`: não há tenant nenhum para criar junto.
 */
export class RegisterPessoalDto {
  @ApiProperty({ example: "Ana Souza" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @ApiProperty({ example: "ana@email.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "11987654321" })
  @IsBrazilianPhone()
  telefone!: string;

  @ApiProperty({ example: "52998224725" })
  @IsCpf()
  cpf!: string;

  @ApiProperty({ example: "SenhaForte123", minLength: 8 })
  @IsStrongPassword()
  senha!: string;

  @ApiProperty({
    example: true,
    description:
      "Aceite dos Termos de Uso e da Política de Privacidade (LGPD) — obrigatoriamente true.",
  })
  @IsBoolean()
  @Equals(true, { message: "É necessário aceitar os Termos de Uso e a Política de Privacidade." })
  aceiteTermos!: boolean;
}
