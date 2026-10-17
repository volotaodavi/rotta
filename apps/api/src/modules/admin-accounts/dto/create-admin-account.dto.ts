import { ApiProperty } from "@nestjs/swagger";
import { AdminRottaPapel } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsString, MaxLength } from "class-validator";

import { IsBrazilianMobile, IsCpf, IsLoginEmail, IsStrongPassword } from "@/common/validators";

/**
 * Cria uma nova conta `User.isAdminRotta` (pedido do usuário
 * 03/09/2026: "DEPOIS, crie outros acessos para o painel do admin,
 * porém com particularidades") — só `AdminRottaPapel.GERAL` acessa
 * (`AdminAccountsController` sem `@AdminAreas`, default GERAL-only do
 * `AdminAreaGuard`). Nunca uma rota pública — `AuthService.register*`
 * nunca cria `isAdminRotta: true`.
 */
export class CreateAdminAccountDto {
  @ApiProperty({ example: "Maria Suporte" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @ApiProperty({ example: "suporte@rottabr.com.br" })
  @IsLoginEmail()
  email!: string;

  @ApiProperty({ example: "11987654321" })
  @IsBrazilianMobile()
  telefone!: string;

  @ApiProperty({ example: "52998224725" })
  @IsCpf()
  cpf!: string;

  @ApiProperty({ example: "SenhaForte123", minLength: 8 })
  @IsStrongPassword()
  senha!: string;

  @ApiProperty({
    enum: AdminRottaPapel,
    description:
      "GERAL: acesso total (inclusive transferências financeiras). SUPORTE: só Suporte/Identidade/Veículos. FINANCEIRO: só as áreas financeiras, sempre leitura.",
  })
  @IsEnum(AdminRottaPapel)
  papel!: AdminRottaPapel;
}
