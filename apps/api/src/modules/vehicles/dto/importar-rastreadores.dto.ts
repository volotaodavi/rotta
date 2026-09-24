import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from "class-validator";

/**
 * Uma linha da planilha do fornecedor de rastreadores.
 *
 * `identificador` aceita o NÚMERO do ônibus ou a placa, nesta ordem de
 * preferência: o número é o que a transportadora usa no dia a dia e o
 * que vem na planilha da instalação, mas a frota privada não tem
 * número — aceitar os dois evita exigir que alguém converta a planilha
 * à mão antes de importar.
 */
export class ItemRastreadorDto {
  @ApiProperty({ example: "412", description: "Número do ônibus ou placa." })
  @IsString()
  @Length(1, 20)
  identificador!: string;

  @ApiProperty({ example: "863719060123456" })
  @IsString()
  @Length(14, 17)
  imei!: string;
}

/**
 * Credenciamento de um LOTE de rastreadores (pedido do usuário
 * 24/09/2026: "comprei um lote de rastreador... como irei cadastrar
 * pela primeira vez?").
 *
 * Um a um no painel não escala: numa rede municipal são dezenas de
 * ônibus, e a planilha do instalador já vem com ônibus + IMEI lado a
 * lado. Esta rota recebe essa planilha inteira de uma vez.
 *
 * NÃO é atômica de propósito: uma linha com IMEI repetido não pode
 * derrubar as outras 39 que estavam certas. A resposta diz linha a
 * linha o que entrou e o que não entrou, e a importação pode ser
 * repetida depois só com as linhas corrigidas (recredenciar o mesmo
 * IMEI no mesmo ônibus é inofensivo).
 */
export class ImportarRastreadoresDto {
  @ApiProperty({ description: "Transportadora dona destes ônibus." })
  @IsUUID()
  companyId!: string;

  @ApiProperty({ type: [ItemRastreadorDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ItemRastreadorDto)
  itens!: ItemRastreadorDto[];
}
