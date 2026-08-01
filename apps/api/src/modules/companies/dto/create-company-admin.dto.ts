import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";

import { IsBrazilianPhone, IsCpf, IsStrongPassword } from "@/common/validators";

/**
 * Dados do primeiro usuário administrador criado junto da Empresa
 * (Dossiê 16 — "Cadastro de Empresa"). Para `tipo: AUTONOMO`, o
 * `CompaniesService` exige que `cpf` seja igual ao `cpfCnpj` da empresa
 * (Dossiê 16, "Motorista Autônomo... automaticamente Administrador").
 */
export class CreateCompanyAdminDto {
  @ApiProperty({ example: "Ana Souza" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nome!: string;

  @ApiProperty({ example: "ana@transportadora.com.br" })
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
}
