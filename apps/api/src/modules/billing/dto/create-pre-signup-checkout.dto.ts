import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEmail, IsIn, IsOptional, IsString, ValidateIf, ValidateNested } from "class-validator";

import { AsaasCreditCardDto, AsaasCreditCardHolderInfoDto } from "./create-asaas-checkout.dto";

import type { AsaasBillingType } from "../types/asaas.types";

import { AtLeastOneContato } from "@/common/validators/at-least-one-contato.decorator";

/**
 * Checkout Pix ANTES de existir conta/empresa (Dossiê 26, pedido do
 * usuário 31/08/2026: "Assinar o plano e com uma integração criar a
 * conta e daí ele validar"). Sem `companyId` nenhum — o pagamento nasce
 * solto (`PendingSubscription`) e só vira `Company` quando alguém
 * completa o cadastro com um dado que bata (`CompaniesService.create`,
 * ver `CompaniesService.findMatchingPendingSubscription`).
 *
 * `email`/`cpfCnpj`/`telefone` são opcionais só entre si — pelo menos 1
 * é exigido (`@AtLeastOneContato`, ancorada no campo `email` mas valida
 * os 3 juntos), nunca os 3 obrigatórios ao mesmo tempo.
 */
export class CreatePreSignupPixDto {
  @ApiProperty({
    example: "João da Silva",
    description: "Nome de quem está pagando — vira o nome sugerido ao completar o cadastro depois.",
  })
  @IsString()
  nome!: string;

  @ApiPropertyOptional({ example: "joao@example.com" })
  @IsOptional()
  @IsEmail()
  @AtLeastOneContato()
  email?: string;

  @ApiPropertyOptional({ example: "12345678909" })
  @IsOptional()
  @IsString()
  cpfCnpj?: string;

  @ApiPropertyOptional({ example: "21999998888" })
  @IsOptional()
  @IsString()
  telefone?: string;
}

/**
 * Checkout cartão/débito/boleto ANTES de existir conta (mesmo raciocínio
 * de `CreatePreSignupPixDto` acima). Diferença real: `email`/`cpfCnpj`
 * são SEMPRE obrigatórios aqui — não por escolha de produto, mas porque
 * a própria Asaas exige os dois pra criar um `customer`
 * (`CreateAsaasCustomerInput.cpfCnpj`, restrição da API, não da Rotta).
 * `telefone` continua opcional, só mais uma chave de correspondência.
 */
export class CreatePreSignupAsaasDto {
  @ApiProperty({ example: "João da Silva" })
  @IsString()
  nome!: string;

  @ApiProperty({ example: "joao@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "12345678909" })
  @IsString()
  cpfCnpj!: string;

  @ApiPropertyOptional({ example: "21999998888" })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiProperty({
    enum: ["CREDIT_CARD", "DEBIT_CARD", "BOLETO"],
    description: "Mesmo método do checkout autenticado (`CreateAsaasCheckoutDto`).",
  })
  @IsIn(["CREDIT_CARD", "DEBIT_CARD", "BOLETO"])
  billingType!: AsaasBillingType;

  @ApiPropertyOptional({ type: AsaasCreditCardDto })
  @ValidateIf((dto: CreatePreSignupAsaasDto) => dto.billingType !== "BOLETO")
  @ValidateNested()
  @Type(() => AsaasCreditCardDto)
  cartao?: AsaasCreditCardDto;

  @ApiPropertyOptional({ type: AsaasCreditCardHolderInfoDto })
  @ValidateIf((dto: CreatePreSignupAsaasDto) => dto.billingType !== "BOLETO")
  @ValidateNested()
  @Type(() => AsaasCreditCardHolderInfoDto)
  titular?: AsaasCreditCardHolderInfoDto;
}
