import type { VehicleResponseDto } from "./dto/vehicle-response.dto";

import {
  toCsv,
  toExcelBuffer,
  toPdfBuffer,
  type ExportColumn,
} from "@/common/utils/tabular-export.util";


/**
 * Exportação de listagem de veículos (briefing "EXPORTAÇÃO" — PDF/Excel/
 * CSV) — colunas específicas de Veículo sobre o utilitário genérico em
 * `@/common/utils/tabular-export.util`, nunca reimplementando a
 * construção de Workbook/PDF aqui.
 */
const COLUMNS: ExportColumn<VehicleResponseDto>[] = [
  { header: "Placa", value: (v) => v.placa },
  { header: "Modelo", value: (v) => v.modelo },
  { header: "Marca", value: (v) => v.marca },
  { header: "Tipo", value: (v) => v.tipo },
  { header: "Status", value: (v) => v.status },
  { header: "Capacidade", value: (v) => v.capacidadePassageiros },
  { header: "Quilometragem", value: (v) => v.quilometragemAtual },
];

export function vehiclesToCsv(vehicles: VehicleResponseDto[]): string {
  return toCsv(vehicles, COLUMNS);
}

export function vehiclesToExcelBuffer(vehicles: VehicleResponseDto[]): Promise<Buffer> {
  return toExcelBuffer(vehicles, COLUMNS, "Veículos");
}

export function vehiclesToPdfBuffer(vehicles: VehicleResponseDto[]): Promise<Buffer> {
  return toPdfBuffer(vehicles, COLUMNS, "Rotta — Relatório de Veículos");
}
