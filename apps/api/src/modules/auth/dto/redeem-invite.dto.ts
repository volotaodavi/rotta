import { ApiProperty } from "@nestjs/swagger";
import { Equals, IsBoolean, IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";

import { IsBrazilianPhone, IsCpf, IsStrongPassword } from "@/common/validators";

/**
 * Resgate de convite (Dossiê 15, `AUTH-01-A1`) — "Já fui convidado". Se
 * o e-mail/telefone/CPF já pertencerem a uma conta existente (RN-06: a
 * mesma pessoa pode ter vínculos em tenants diferentes), `senha` precisa
 * corresponder à conta já existente (prova de posse); do contrário um
 * `User` novo é criado com estes dados.
 */
export class RedeemInviteDto {
  @ApiProperty({ example: "M586PO" })
  @IsString()
  @IsNotEmpty()
  codigo!: string;

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

  @ApiProperty({ example: "SenhaForte123" })
  @IsStrongPassword()
  senha!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true, { message: "É necessário aceitar os Termos de Uso e a Política de Privacidade." })
  aceiteTermos!: boolean;
}
