import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

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
/**
 * Sinais de atribuição de campanha, lidos dos cookies que o próprio
 * Pixel do Meta criou no navegador de quem está pagando.
 *
 * Opcionais sempre, e sem nenhum efeito sobre o pagamento: quem chegou
 * por fora de anúncio, recusou os cookies ou usa bloqueador
 * simplesmente não manda nada, e a venda fica sem atribuição em vez de
 * ganhar uma atribuição inventada.
 *
 * Nenhum dos dois é dado pessoal declarado: são identificadores que o
 * Meta criou e que estão sendo devolvidos a ele
 * (`MetaConversionsService`).
 */
export class AtribuicaoDeCampanhaDto {
  @ApiPropertyOptional({
    example: "fb.1.1696500000000.1234567890",
    description: "Cookie `_fbp`: identifica o navegador.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fbp?: string;

  @ApiPropertyOptional({
    example: "fb.1.1696500000000.IwAR0abc",
    description: "Cookie `_fbc`: identifica o CLIQUE no anúncio. É o que liga a venda à campanha.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fbc?: string;
}

export class CreatePreSignupPixDto {
  @ApiProperty({
    example: "João da Silva",
    description: "Nome de quem está pagando: vira o nome sugerido ao completar o cadastro depois.",
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

  @ApiPropertyOptional({ type: AtribuicaoDeCampanhaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AtribuicaoDeCampanhaDto)
  atribuicao?: AtribuicaoDeCampanhaDto;
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

  @ApiPropertyOptional({ type: AtribuicaoDeCampanhaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AtribuicaoDeCampanhaDto)
  atribuicao?: AtribuicaoDeCampanhaDto;
}
