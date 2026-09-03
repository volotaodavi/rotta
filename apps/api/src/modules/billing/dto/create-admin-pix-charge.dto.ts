import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEmail, IsInt, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";

/**
 * `POST /billing/admin/pix-charges` (pedido do usuário 03/09/2026:
 * "posso também pedir o recebimento de transferências através da
 * plataforma? Incluindo o QR Code pix?") — cobrança Pix avulsa, sem
 * vínculo com mensalidade de nenhuma empresa. `AdminArea.FINANCEIRO`
 * também acessa (é um RECEBÍVEL, nunca dinheiro saindo da conta —
 * risco bem menor que `CreateAdminTransferDto`, que é GERAL-only).
 */
export class CreateAdminPixChargeDto {
  @ApiProperty({ description: "Valor da cobrança, em centavos.", example: 5000 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  valorCentavos!: number;

  @ApiPropertyOptional({ description: "Descrição/motivo da cobrança, opcional." })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  descricao?: string;

  @ApiProperty({ description: "Nome de quem vai pagar." })
  @IsString()
  @MaxLength(200)
  nomePagador!: string;

  @ApiProperty({ description: "CPF ou CNPJ de quem vai pagar (exigido pela Asaas)." })
  @IsString()
  @MaxLength(20)
  cpfCnpjPagador!: string;

  @ApiPropertyOptional({ description: "E-mail de quem vai pagar, opcional." })
  @IsOptional()
  @IsEmail()
  emailPagador?: string;
}
