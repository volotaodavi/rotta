import { ApiProperty } from "@nestjs/swagger";
import { Equals, IsBoolean, IsEmail, IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";

import { IsBrazilianPhone, IsCpf, IsStrongPassword } from "@/common/validators";
import { Role } from "@/shared/enums";

/** Só quem dirige/acompanha; nunca `Role.EMPRESA` (esse cria a Company junto, ver `RegisterEmpresaDto`). */
const AUTONOMOUS_ROLES = [Role.MOTORISTA, Role.MONITOR] as const;

/**
 * Cadastro self-service de Motorista/Monitor autônomo (Frente N, briefing
 * item 9 — "criar conta, Didit, informar o número [código único da
 * transportadora] e se integrar como monitor"), SEM `Company`/`Membership`
 * ainda — mesmo mecanismo de `RegisterPessoalDto` (identidade global via
 * `User.autonomoRole`, ver nota em `schema.prisma`). Depois de completar a
 * Didit, o vínculo em si acontece via `CompanyJoinRequestsService.create`.
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
    example: true,
    description:
      "Aceite dos Termos de Uso e da Política de Privacidade (LGPD) — obrigatoriamente true.",
  })
  @IsBoolean()
  @Equals(true, { message: "É necessário aceitar os Termos de Uso e a Política de Privacidade." })
  aceiteTermos!: boolean;
}
