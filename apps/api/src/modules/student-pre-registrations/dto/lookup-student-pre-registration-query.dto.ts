import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * "Código único do transporte" + celular (pedido do usuário: "o
 * responsável ao entrar no app/web deverá colocar o código único do
 * transporte, após isso pedirá o número de celular e automaticamente
 * irá buscar o aluno respectivo + responsável"). Mesmo
 * `Company.codigoInterno` público usado em `CompanyJoinRequestsService`/
 * Marketplace — nunca aceita um `companyId` direto do cliente.
 */
export class LookupStudentPreRegistrationQueryDto {
  @ApiProperty({ example: "TRN-000001" })
  @IsString()
  @IsNotEmpty()
  codigoInterno!: string;

  @ApiProperty({ example: "(11) 98888-7777" })
  @IsString()
  @IsNotEmpty()
  celular!: string;
}
