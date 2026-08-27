import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEmail, IsIn, IsOptional, IsString, ValidateIf, ValidateNested } from "class-validator";

import type { AsaasBillingType } from "../types/asaas.types";

/**
 * Checkout próprio da Rotta (Dossiê 26 — "página própria para receber
 * os pagamentos, porém utilizando a Asaas por trás"). `cartao`/`titular`
 * só são obrigatórios quando `billingType` é `CREDIT_CARD`/`DEBIT_CARD`
 * — boleto não precisa de nenhum dos dois (`ValidateIf` evita exigir
 * campos que não fazem sentido pro método escolhido).
 */
export class AsaasCreditCardDto {
  @ApiProperty({ example: "JOAO DA SILVA" })
  @IsString()
  holderName!: string;

  @ApiProperty({ example: "5162306219378829" })
  @IsString()
  number!: string;

  @ApiProperty({ example: "05" })
  @IsString()
  expiryMonth!: string;

  @ApiProperty({ example: "2030" })
  @IsString()
  expiryYear!: string;

  @ApiProperty({ example: "318" })
  @IsString()
  ccv!: string;
}

export class AsaasCreditCardHolderInfoDto {
  @ApiProperty({ example: "João da Silva" })
  @IsString()
  name!: string;

  @ApiProperty({ example: "joao@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "12345678909" })
  @IsString()
  cpfCnpj!: string;

  @ApiProperty({ example: "20010000" })
  @IsString()
  postalCode!: string;

  @ApiProperty({ example: "123" })
  @IsString()
  addressNumber!: string;

  @ApiPropertyOptional({ example: "21999998888" })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateAsaasCheckoutDto {
  @ApiProperty({
    enum: ["CREDIT_CARD", "DEBIT_CARD", "BOLETO"],
    description:
      "Método escolhido no checkout próprio da Rotta — Pix continua num endpoint separado (AbacatePay).",
  })
  @IsIn(["CREDIT_CARD", "DEBIT_CARD", "BOLETO"])
  billingType!: AsaasBillingType;

  @ApiPropertyOptional({ type: AsaasCreditCardDto })
  @ValidateIf((dto: CreateAsaasCheckoutDto) => dto.billingType !== "BOLETO")
  @ValidateNested()
  @Type(() => AsaasCreditCardDto)
  cartao?: AsaasCreditCardDto;

  @ApiPropertyOptional({ type: AsaasCreditCardHolderInfoDto })
  @ValidateIf((dto: CreateAsaasCheckoutDto) => dto.billingType !== "BOLETO")
  @ValidateNested()
  @Type(() => AsaasCreditCardHolderInfoDto)
  titular?: AsaasCreditCardHolderInfoDto;
}
