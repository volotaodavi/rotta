import { Workbook } from "exceljs";
import PDFDocument from "pdfkit";

/**
 * Exportação tabular genérica (CSV/Excel/PDF) — extraído do módulo
 * Veículos (primeiro a precisar disso) quando o módulo Escolas também
 * passou a exigir a mesma capacidade, para nunca duplicar a construção
 * de `Workbook`/`PDFDocument` por módulo (briefing "Nunca criar código
 * duplicado"). Cada módulo só declara suas colunas (`ExportColumn<T>[]`)
 * e chama estas três funções — nenhum deles importa `exceljs`/`pdfkit`
 * diretamente.
 */
export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | Date | null | undefined;
}

function csvEscape(value: string | number | boolean | Date | null | undefined): string {
  const text =
    value === null || value === undefined
      ? ""
      : value instanceof Date
        ? value.toISOString()
        : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const header = columns.map((column) => csvEscape(column.header)).join(",");
  const body = rows.map((row) => columns.map((column) => csvEscape(column.value(row))).join(","));
  return [header, ...body].join("\n");
}

export async function toExcelBuffer<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  sheetName: string,
): Promise<Buffer> {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((column) => ({ header: column.header, width: 18 }));
  for (const row of rows) {
    sheet.addRow(columns.map((column) => column.value(row) ?? null));
  }
  sheet.getRow(1).font = { bold: true };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function toPdfBuffer<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  title: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(title, { align: "center" });
    doc.moveDown();
    doc.fontSize(9);

    const columnWidth = Math.min(105, Math.floor((doc.page.width - 80) / columns.length));
    const startX = doc.x;
    let y = doc.y;

    columns.forEach((column, index) => {
      doc.text(column.header, startX + index * columnWidth, y, { width: columnWidth });
    });
    y += 16;
    doc
      .moveTo(startX, y)
      .lineTo(startX + columnWidth * columns.length, y)
      .stroke();
    y += 6;

    for (const row of rows) {
      columns.forEach((column, index) => {
        const value = column.value(row);
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
