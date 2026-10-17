import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Uma fatura de mensalidade como a tela lê.
 *
 * Os valores saem em CENTAVOS inteiros e também já formatados. O
 * formatado existe porque a tela do app não pode inventar locale de
 * moeda por conta própria (o erro apareceria na fatura de uma família);
 * o centavo existe porque conta de dinheiro nunca se faz em cima de
 * texto.
 */
export class ContractInvoiceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() contractId!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentNome!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty({ description: "Nome da transportadora que está cobrando" })
  transportadoraNome!: string;

  @ApiProperty({ description: "Primeiro dia do mês de competência (AAAA-MM-DD)" })
  competencia!: string;
  @ApiProperty({ description: 'Competência escrita, ex. "Abr/2026"' })
  competenciaRotulo!: string;
  @ApiProperty({ description: "AAAA-MM-DD" }) vencimento!: string;

  @ApiProperty() valorCentavos!: number;
  @ApiProperty({ example: "R$ 660,00" }) valorFormatado!: string;

  @ApiProperty({ enum: ["A_VENCER", "PAGA", "VENCIDA", "CANCELADA", "ESTORNADA"] })
  status!: string;

  @ApiPropertyOptional({ enum: ["PIX", "BOLETO", "CARTAO_CREDITO", "CARTAO_DEBITO"] })
  meioDePagamento?: string | null;
  @ApiPropertyOptional({ description: "Página da fatura hospedada pela Asaas" })
  linkDaFatura?: string | null;
  @ApiPropertyOptional() linhaDigitavel?: string | null;

  @ApiPropertyOptional() pagoEm?: Date | null;
  @ApiPropertyOptional() valorPagoCentavos?: number | null;
}

export class ListContractInvoicesResponseDto {
  @ApiProperty({ type: [ContractInvoiceResponseDto] }) items!: ContractInvoiceResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

/** Um grupo do "Resumo de faturas" da tela do Responsável. */
export class ResumoDeFaturasDto {
  @ApiProperty() status!: string;
  @ApiProperty() quantidade!: number;
  @ApiProperty() totalCentavos!: number;
  @ApiProperty() totalFormatado!: string;
}

/** O que a tela de Pagamentos do Responsável precisa, de uma vez. */
export class PagamentosDoResponsavelResponseDto {
  @ApiProperty() studentId!: string;
  @ApiProperty() alunoNome!: string;
  @ApiProperty({ type: [ResumoDeFaturasDto] }) resumo!: ResumoDeFaturasDto[];
  @ApiProperty({ type: [ContractInvoiceResponseDto] }) faturas!: ContractInvoiceResponseDto[];
  @ApiProperty() totalEmAbertoCentavos!: number;
  @ApiPropertyOptional({ nullable: true }) totalEmAbertoFormatado?: string | null;
  @ApiProperty({
    description:
      "Falso quando a cobrança pelo app ainda não está ligada nesta implantação (Asaas não configurada): a tela mostra valor e vencimento, mas não oferece pagar.",
  })
  pagamentoNoAppDisponivel!: boolean;
}

/** O Pix de uma fatura: o que a família copia, lê ou escaneia. */
export class PagamentoDaFaturaResponseDto {
  @ApiProperty() invoiceId!: string;
  @ApiProperty({ enum: ["PIX", "BOLETO"] }) meioDePagamento!: string;
  @ApiProperty() valorCentavos!: number;
  @ApiProperty() valorFormatado!: string;
  @ApiPropertyOptional({ description: "Pix copia e cola" }) pixPayload?: string | null;
  @ApiPropertyOptional({ description: "QR em base64, sem o prefixo data:" })
  pixQrCodeBase64?: string | null;
  @ApiPropertyOptional() pixExpiraEm?: string | null;
  @ApiPropertyOptional() linhaDigitavel?: string | null;
  @ApiPropertyOptional() linkDaFatura?: string | null;
  @ApiProperty({ description: "Status da fatura no momento da resposta" }) status!: string;
}
