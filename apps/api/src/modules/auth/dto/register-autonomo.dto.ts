import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import { IsBrazilianPhone, IsCpf, IsStrongPassword } from "@/common/validators";
import { Role } from "@/shared/enums";

/** Só quem dirige/acompanha; nunca `Role.EMPRESA` (esse cria a Company junto, ver `RegisterEmpresaDto`). */
const AUTONOMOUS_ROLES = [Role.MOTORISTA, Role.MONITOR] as const;

/**
 * Cadastro self-service de Motorista/Monitor autônomo (Frente N, briefing
 * item 9 — "criar conta, Didit, informar o número [código único da
 * transportadora] e se integrar como monitor"), SEM `Company`/`Membership`
 * ainda — mesmo mecanismo de `RegisterPessoalDto` (identidade global via
 * `User.autonomoRole`, ver nota em `schema.prisma`).
 *
 * `codigoInterno` (Frente 9, auditoria 31/08/2026) — opcional; quando
 * presente, `AuthService.registerAutonomo` já cria o `CompanyJoinRequest`
 * PENDENTE na mesma chamada (mesma unificação "código → dados → conta"
 * que o Responsável já tinha via `RegisterPessoalDto.preRegistrationId`).
 * Sem ele, o vínculo continua um passo separado depois de autenticado
 * (`CompanyJoinRequestsService.create`, tela "Meu pedido") — nenhum
 * comportamento antigo quebra.
 */
export class RegisterAutonomoDto {
  @ApiProperty({ example: "João Motorista" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @ApiProperty({ example: "joao@email.com" })
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

  @ApiProperty({ enum: AUTONOMOUS_ROLES, example: Role.MOTORISTA })
  @IsIn(AUTONOMOUS_ROLES)
  role!: Role;

  @ApiProperty({
    example: "TRN-000001",
    required: false,
    description:
      "Código da transportadora (Frente 9, auditoria 31/08/2026 — pedido do usuário: 'código primeiro, depois dados, depois conta, como continuação de um único fluxo'). Opcional: sem ele, a conta nasce solta (comportamento de sempre — quem quiser vincular depois, usa 'Meu pedido'). Com ele, um `CompanyJoinRequest` PENDENTE é criado na mesma chamada — a aprovação da empresa continua manual, só a ORDEM do fluxo muda (antes: conta → código, num passo separado depois de autenticado).",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  codigoInterno?: string;

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
      "Token do widget Cloudflare Turnstile ('não sou um robô', pedido do usuário 01/09/2026) — só exigido quando o cadastro vem da web (ver `AuthService.assertHumanIfWeb`); ausente no app nativo, que não tem widget de navegador.",
  })
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
