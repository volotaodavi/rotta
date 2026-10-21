import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min, ValidateNested } from "class-validator";

/** A custódia de uma subconta: ligar, desligar, e quem paga a tarifa. */
export class ConfigurarCustodiaDto {
  @ApiPropertyOptional({
    description:
      "Liga ou desliga a retenção dos recebimentos da subconta. Exige subconta criada e emissor `SUBCONTA`: a documentação de conta escrow diz que só as subcontas com o recurso habilitado têm os próprios recebimentos retidos, e a conta principal não tem custódia.",
  })
  @IsBoolean()
  ativa!: boolean;

  @ApiPropertyOptional({
    description: "Dias de retenção antes de liberar o valor para a transportadora.",
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  diasParaLiberar?: number;

  @ApiPropertyOptional({
    enum: ["CONTA_PRINCIPAL", "SUBCONTA"],
    description:
      "Quem paga a tarifa recorrente da custódia. O VALOR da tarifa não é publicado pelo Asaas: a documentação confirma que ela existe e remete ao comercial.",
  })
  @IsOptional()
  @IsIn(["CONTA_PRINCIPAL", "SUBCONTA"])
  tarifaPagaPor?: "CONTA_PRINCIPAL" | "SUBCONTA";
}

/**
 * Os controles do recebimento de uma transportadora.
 *
 * ## Por que isto existe
 *
 * Até 21/10/2026 a taxa por meio, o emissor da cobrança e a custódia
 * eram campos **somente lidos**: nasciam no padrão da migration (taxa
 * zero, emissor `ROTTA`, custódia desligada) e nenhum endpoint os
 * escrevia. O passo a passo de ligar uma transportadora por vez só podia
 * ser executado com SQL direto no banco, o que não é operação.
 *
 * ## Por que só o Admin Rotta
 *
 * Taxa é decisão de preço, e preço é do fundador. O emissor decide quem
 * responde por chargeback de até 540 dias. A custódia tem tarifa
 * recorrente por subconta ligada. Nenhuma das três é escolha de quem é
 * cobrado por elas — uma transportadora que pudesse editar a própria
 * taxa a poria em zero.
 *
 * Tudo opcional: só o que vem no corpo muda. Mandar o objeto vazio não
 * é erro, e não mexe em nada.
 */
export class ConfigurarRecebimentoDto {
  @ApiPropertyOptional({
    description:
      "Taxa da Rotta no Pix, em pontos-base (1% = 100). A tabela aprovada em 20/10/2026 usa 129 (1,29%).",
    minimum: 0,
    maximum: 10_000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  /* Teto de 100%: o percentual incide sobre o valor liquidado, e acima
     de 10.000 pontos-base a Rotta estaria retendo mais do que entrou. */
  @Max(10_000)
  taxaPixBps?: number;

  @ApiPropertyOptional({
    description: "Taxa da Rotta no boleto, em pontos-base. Tabela aprovada: 129 (1,29%).",
    minimum: 0,
    maximum: 10_000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  taxaBoletoBps?: number;

  @ApiPropertyOptional({
    description: "Taxa da Rotta no crédito à vista, em pontos-base. Tabela aprovada: 99 (0,99%).",
    minimum: 0,
    maximum: 10_000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  taxaCreditoVistaBps?: number;

  @ApiPropertyOptional({
    description: "Taxa da Rotta no crédito parcelado, em pontos-base. Tabela aprovada: 49 (0,49%).",
    minimum: 0,
    maximum: 10_000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  taxaCreditoParceladoBps?: number;

  @ApiPropertyOptional({
    enum: ["ROTTA", "SUBCONTA"],
    description:
      "Quem emite a cobrança da família. `ROTTA` é o padrão e funciona sem depender de ninguém: a cobrança é da conta principal, com split para a transportadora, e a conta da Rotta responde sozinha por chargeback de até 540 dias. `SUBCONTA` é o único modelo em que a custódia existe, e exige a chave da subconta guardada.",
  })
  @IsOptional()
  @IsIn(["ROTTA", "SUBCONTA"])
  emissorDaCobranca?: "ROTTA" | "SUBCONTA";

  @ApiPropertyOptional({ type: ConfigurarCustodiaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConfigurarCustodiaDto)
  custodia?: ConfigurarCustodiaDto;
}
