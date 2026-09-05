import type { CompanyBiRow } from "./repositories/analytics.repository";

import {
  toCsv,
  toExcelBuffer,
  toPdfBuffer,
  type ExportColumn,
} from "@/common/utils/tabular-export.util";

/**
 * Exportação nacional por empresa (briefing "Relatórios exportáveis
 * PDF/Excel/CSV") — colunas específicas de Analytics sobre o utilitário
 * genérico em `@/common/utils/tabular-export.util`, mesmo padrão de
 * `vehicle-export.util.ts`/`school-import.util.ts` (nunca reimplementa
 * `Workbook`/`PDFDocument` aqui).
 */
const COLUMNS: ExportColumn<CompanyBiRow>[] = [
  { header: "Empresa", value: (row) => row.nomeFantasia },
  { header: "Status", value: (row) => row.status },
  { header: "Plano", value: (row) => row.planoNome },
  { header: "Mensalidade (R$)", value: (row) => (row.mensalidadeCentavos / 100).toFixed(2) },
  { header: "Motoristas ativos", value: (row) => row.motoristasAtivos },
  { header: "Veículos", value: (row) => row.veiculosTotal },
  { header: "Contratos ativos", value: (row) => row.contratosAtivos },
  { header: "Viagens no período", value: (row) => row.viagensNoPeriodo },
];

export function companyBiRowsToCsv(rows: CompanyBiRow[]): string {
  return toCsv(rows, COLUMNS);
}

export function companyBiRowsToExcelBuffer(rows: CompanyBiRow[]): Promise<Buffer> {
  return toExcelBuffer(rows, COLUMNS, "Empresas");
}

export function companyBiRowsToPdfBuffer(rows: CompanyBiRow[]): Promise<Buffer> {
  return toPdfBuffer(rows, COLUMNS, "Rotta — Business Intelligence Nacional");
}
