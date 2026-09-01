import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

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

  @ApiPropertyOptional({
    description:
      "Área pública de convite (pedido do usuário: 'código da transportadora' + celular já achou um pré-cadastro pendente) — reivindica esse pré-cadastro automaticamente logo após criar a conta. Best-effort: se não bater mais (já reclamado por outra pessoa, por exemplo), o cadastro segue normalmente sem travar.",
  })
  @IsOptional()
  @IsString()
  preRegistrationId?: string;

  @ApiPropertyOptional({
    description:
      "Token do widget Cloudflare Turnstile ('não sou um robô', pedido do usuário 01/09/2026) — só exigido quando o cadastro vem da web (ver `AuthService.assertHumanIfWeb`); ausente no app nativo, que não tem widget de navegador.",
  })
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
