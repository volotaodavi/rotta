import { formatarCentavos } from "@rotta/utils";

import type {
  ContractInvoiceResponseDto,
  ListContractInvoicesResponseDto,
  ResumoDeFaturasDto,
} from "../dto/contract-invoice-response.dto";
import type {
  ContractInvoiceComContexto,
  ListContractInvoicesResult,
} from "../repositories/contract-invoice.repository";
import type { ContractInvoiceStatus } from "@prisma/client";

/** Estados que ainda pedem dinheiro da família. */
export const FATURA_EM_ABERTO: ContractInvoiceStatus[] = ["A_VENCER", "VENCIDA"];

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** `AAAA-MM-DD` de uma coluna `@db.Date` — sem fuso, que é o ponto de usar Date no banco. */
export function paraDiaDoCalendario(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** `2026-04-01` -> `"Abr/2026"`, o rótulo de competência do conceito visual. */
export function rotuloDeCompetencia(competencia: Date): string {
  const mes = MESES[competencia.getUTCMonth()] ?? "";
  return `${mes}/${competencia.getUTCFullYear()}`;
}

export function toContractInvoiceResponseDto(
  fatura: ContractInvoiceComContexto,
): ContractInvoiceResponseDto {
  return {
    id: fatura.id,
    contractId: fatura.contractId,
    studentId: fatura.studentId,
    studentNome: fatura.student.nome,
    companyId: fatura.companyId,
    transportadoraNome: fatura.company.nomeFantasia,
    competencia: paraDiaDoCalendario(fatura.competencia),
    competenciaRotulo: rotuloDeCompetencia(fatura.competencia),
    vencimento: paraDiaDoCalendario(fatura.vencimento),
    valorCentavos: fatura.valorCentavos,
    valorFormatado: formatarCentavos(fatura.valorCentavos),
    status: fatura.status,
    meioDePagamento: fatura.meioDePagamento,
    linkDaFatura: fatura.linkDaFatura,
    linhaDigitavel: fatura.linhaDigitavel,
    pagoEm: fatura.pagoEm,
    valorPagoCentavos: fatura.valorPagoCentavos,
  };
}

export function toListContractInvoicesResponseDto(
  resultado: ListContractInvoicesResult,
  page: number,
  pageSize: number,
): ListContractInvoicesResponseDto {
  return {
    items: resultado.items.map(toContractInvoiceResponseDto),
    total: resultado.total,
    page,
    pageSize,
  };
}

/**
 * Os grupos do "Resumo de faturas".
 *
 * Só aparecem os estados que de fato existem nas faturas do aluno —
 * mostrar "Vencidas: 0" onde nunca houve atraso é dar destaque a uma
 * coisa que não aconteceu.
 */
export function toResumoDeFaturas(faturas: ContractInvoiceComContexto[]): ResumoDeFaturasDto[] {
  const porStatus = new Map<string, { quantidade: number; totalCentavos: number }>();

  for (const fatura of faturas) {
    const atual = porStatus.get(fatura.status) ?? { quantidade: 0, totalCentavos: 0 };
    atual.quantidade += 1;
    atual.totalCentavos += fatura.valorCentavos;
    porStatus.set(fatura.status, atual);
  }

  return [...porStatus.entries()].map(([status, grupo]) => ({
    status,
    quantidade: grupo.quantidade,
    totalCentavos: grupo.totalCentavos,
    totalFormatado: formatarCentavos(grupo.totalCentavos),
  }));
}
