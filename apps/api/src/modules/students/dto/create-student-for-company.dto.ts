import { ApiProperty, ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEmail, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";

import { CreateStudentDto } from "./create-student.dto";

import { IsBrazilianPhone, IsCpf } from "@/common/validators";

/**
 * Dados do Responsável quando ele ainda não tem conta na Rotta (pedido
 * do usuário 02/09/2026: "Admin pode criar a conta do Responsável na
 * hora"). A conta nasce com uma senha aleatória que ninguém vai usar —
 * `StudentsService.createForCompany` dispara na sequência o mesmo
 * "esqueci minha senha" (`AuthService.forgotPassword`) já usado em
 * produção, então a família recebe um link de verdade pra escolher a
 * própria senha, em vez de uma senha provisória exposta em algum
 * lugar.
 */
export class NovoResponsavelDto {
  @ApiProperty({ example: "Ana Souza" })
  @IsString()
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
}

/**
 * Cadastro de Aluno feito pela PRÓPRIA transportadora ou pelo Admin
 * Rotta (pedido do usuário 02/09/2026: "os admins devem ajudar a
 * colocar os alunos... empresas > alunos > cadastramos os alunos...
 * colocamos as escolas, rotas/endereços residenciais... salvamos e
 * pronto") — até aqui só o próprio Responsável conseguia criar um
 * `Student` (`POST /students`, `OWNER_ROLES = [RESPONSAVEL]`); gap real
 * que impedia Empresa/Admin de cadastrar alunos em nome de uma família,
 * mesmo quando é a própria transportadora quem está fazendo o trabalho
 * de campo.
 *
 * Mesmos campos de `CreateStudentDto` (endereço/escola/turno — nunca
 * duplicados aqui) `+` exatamente um entre `responsavelId` (conta já
 * existente) e `novoResponsavel` (cria a conta na hora) `+` `companyId`
 * (só obrigatório pro Admin Rotta, que não tem tenant — Empresa/Gestor
 * usa sempre `actor.tenantId`, nunca um valor vindo do cliente).
 *
 * Sem `preRegistrationId` — esse DTO É o caminho direto, sem o
 * intermediário do "código do transporte" (que continua existindo à
 * parte, para quando a família mesmo é quem completa o cadastro).
 */
export class CreateStudentForCompanyDto extends OmitType(CreateStudentDto, [
  "preRegistrationId",
] as const) {
  @ApiPropertyOptional({
    description:
      "Obrigatório só para Admin Rotta (sem tenant próprio). Ignorado para Empresa/Gestor — sempre a própria empresa do ator.",
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ description: "ID de um Responsável que já tem conta na Rotta." })
  @IsOptional()
  @IsString()
  responsavelId?: string;

  @ApiPropertyOptional({
    type: NovoResponsavelDto,
    description: "Cria a conta do Responsável na hora, caso a família ainda não tenha uma.",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NovoResponsavelDto)
  novoResponsavel?: NovoResponsavelDto;
}
