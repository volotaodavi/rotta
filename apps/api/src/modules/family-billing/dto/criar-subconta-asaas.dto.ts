import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

/**
 * O formulário que cria a subconta Asaas da transportadora, dentro da
 * Rotta.
 *
 * ## Por que tem um campo só, e não doze
 *
 * `POST /v3/accounts` aceita nome, documento, e-mail, telefone,
 * endereço e faturamento. Onze desses doze a Rotta já tem: são os
 * mesmos dados do cadastro da transportadora, conferidos na Receita
 * quando ela entrou. Pedir de novo seria pedir ao transportador que
 * digitasse o próprio CNPJ para um sistema que acabou de mostrar o CNPJ
 * dele na tela.
 *
 * Sobra `incomeValue`, o faturamento mensal: é o único campo que a
 * documentação da Asaas marca como obrigatório, e o único que a Rotta
 * nunca coletou em lugar nenhum. Por isso ele é o formulário.
 *
 * Os dois opcionais existem porque o financeiro costuma ser outra
 * pessoa: a Asaas manda para este e-mail os avisos da conta dela, e
 * quem recebe não é necessariamente quem atende o telefone da empresa.
 * Em branco, valem os do cadastro.
 *
 * ## O que NÃO entra aqui, de propósito
 *
 * `walletId`, `accountId` e a chave de API. Os três vêm da resposta da
 * Asaas, nunca do cliente. Um transportador que pudesse escrever o
 * próprio `walletId` redirecionaria o split de qualquer cobrança.
 */
export class CriarSubcontaAsaasDto {
  @ApiProperty({
    description:
      "Faturamento mensal em centavos. Vira `incomeValue` na Asaas, que é o único campo que a documentação deles marca como obrigatório.",
    example: 450000,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  /* Teto de um bilhão de reais por mês. Não é desconfiança do cliente:
     é o erro de digitação de quem informa em centavos um número que
     pensou em reais, que a Asaas recusaria com uma mensagem nossa
     nenhuma. */
  @Max(100_000_000_000)
  faturamentoMensalCentavos!: number;

  @ApiPropertyOptional({
    description:
      "E-mail do financeiro, se for diferente do e-mail da transportadora. É para cá que a Asaas manda os avisos da conta.",
    example: "financeiro@transportesandrade.com.br",
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description:
      "Celular do financeiro, só dígitos com DDD, se for diferente do da transportadora.",
    example: "21999998888",
  })
  @IsOptional()
  @IsString()
  @Length(10, 11)
  telefone?: string;
}
