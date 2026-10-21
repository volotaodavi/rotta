import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

import { IsCpf } from "@/common/validators";

/**
 * O formulário que liga a cobrança mensal automática de um contrato.
 *
 * ## Por que tem tão pouco campo
 *
 * O contrato já diz tudo o que a recorrência precisa: quem é o aluno,
 * quem é o responsável que paga, quanto é a mensalidade e até quando
 * vale a vigência. Nada disso é perguntado de novo.
 *
 * ## O CPF é o único campo que pode ser inevitável
 *
 * O Asaas exige `cpfCnpj` para criar o cliente da cobrança, e desde
 * 14/09/2026 a Rotta não coleta CPF de Responsável no cadastro, por
 * decisão do fundador. Então, para a família que ainda não tem o
 * documento registrado, ele é informado aqui, por quem tem o contrato em
 * mãos — e fica gravado para as próximas vezes.
 *
 * Responsável que já tem CPF no cadastro não precisa mandar nada: o
 * campo é ignorado quando já existe documento, e nunca sobrescreve.
 */
export class CriarAssinaturaDaFamiliaDto {
  @ApiPropertyOptional({
    description:
      "CPF do responsável que paga, obrigatório só quando ele ainda não tem CPF no cadastro da Rotta. Recusado se já pertencer a outra conta.",
    example: "12345678909",
  })
  @IsOptional()
  @IsCpf()
  cpfDoResponsavel?: string;

  @ApiPropertyOptional({
    description:
      "Dia do vencimento de cada mês. Em branco vale o padrão do transporte escolar (dia 5). Limitado a 28 porque dia 29, 30 e 31 não existem em todo mês.",
    example: 5,
    minimum: 1,
    maximum: 28,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  diaDeVencimento?: number;

  @ApiPropertyOptional({
    enum: ["PIX", "BOLETO", "UNDEFINED"],
    description:
      "Como a família paga. `UNDEFINED` deixa ela escolher na própria página da cobrança. Em branco vale `PIX`. Cartão fica de fora: a captura de cartão colocaria a Rotta em escopo PCI DSS, e essa decisão não é técnica.",
    example: "PIX",
  })
  @IsOptional()
  @IsIn(["PIX", "BOLETO", "UNDEFINED"])
  meioDePagamento?: "PIX" | "BOLETO" | "UNDEFINED";
}
