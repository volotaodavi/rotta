import { Workbook } from "exceljs";
import PDFDocument from "pdfkit";

import type { VehicleResponseDto } from "./dto/vehicle-response.dto";

/**
 * Exportação de listagem de veículos (briefing "EXPORTAÇÃO" — PDF/Excel/
 * CSV). Implementação real em cada formato (nenhum é apenas o CSV
 * renomeado) — `exceljs`/`pdfkit` são as únicas dependências novas deste
 * módulo, ambas amplamente usadas e permissivamente licenciadas.
 */

const COLUMNS: { header: string; key: keyof VehicleResponseDto | "capacidade" }[] = [
  { header: "Placa", key: "placa" },
  { header: "Modelo", key: "modelo" },
  { header: "Marca", key: "marca" },
  { header: "Tipo", key: "tipo" },
  { header: "Status", key: "status" },
  { header: "Capacidade", key: "capacidadePassageiros" },
  { header: "Quilometragem", key: "quilometragemAtual" },
];

function csvEscape(value: string | number | boolean | Date | null | undefined): string {
  const text =
    value === null || value === undefined
      ? ""
      : value instanceof Date
        ? value.toISOString()
        : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function vehiclesToCsv(vehicles: VehicleResponseDto[]): string {
  const header = COLUMNS.map((column) => csvEscape(column.header)).join(",");
  const rows = vehicles.map((vehicle) =>
    COLUMNS.map((column) => csvEscape(vehicle[column.key as keyof VehicleResponseDto])).join(","),
  );
  return [header, ...rows].join("\n");
}

export async function vehiclesToExcelBuffer(vehicles: VehicleResponseDto[]): Promise<Buffer> {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Veículos");
  sheet.columns = COLUMNS.map((column) => ({ header: column.header, key: column.key, width: 18 }));
  sheet.addRows(vehicles);
  sheet.getRow(1).font = { bold: true };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function vehiclesToPdfBuffer(vehicles: VehicleResponseDto[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text("Rotta — Relatório de Veículos", { align: "center" });
    doc.moveDown();
    doc.fontSize(9);

    const columnWidth = 105;
    const startX = doc.x;
    let y = doc.y;

    COLUMNS.forEach((column, index) => {
      doc.text(column.header, startX + index * columnWidth, y, {
        width: columnWidth,
        continued: false,
      });
    });
    y += 16;
    doc
      .moveTo(startX, y)
      .lineTo(startX + columnWidth * COLUMNS.length, y)
      .stroke();
    y += 6;

    for (const vehicle of vehicles) {
      COLUMNS.forEach((column, index) => {
        const value = vehicle[column.key as keyof VehicleResponseDto];
        doc.text(
          value === null || value === undefined ? "-" : String(value),
          startX + index * columnWidth,
          y,
          {
            width: columnWidth,
          },
        );
      });
      y += 16;
      if (y > doc.page.height - 60) {
        doc.addPage({ margin: 40, size: "A4", layout: "landscape" });
        y = doc.y;
      }
    }

    doc.end();
  });
}
