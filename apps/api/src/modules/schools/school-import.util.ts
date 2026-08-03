import { Workbook } from "exceljs";

import type { CreateSchoolData } from "./repositories/school.repository";
import type { SchoolAdministrativeDependency, SchoolShift, SchoolType } from "@prisma/client";

/**
 * Importação real de Escolas (briefing "IMPORTAÇÃO" — CSV/Excel/JSON;
 * "API Oficial" é tratada à parte por `InepSyncService`, ver
 * `schools.module.ts`). Cada linha vira um `CreateSchoolData` OU um
 * erro — uma linha malformada nunca aborta o restante do arquivo
 * (`SchoolsService.importFromFile` acumula os erros e segue).
 */

const REQUIRED_COLUMNS = [
  "nomeOficial",
  "dependenciaAdministrativa",
  "cep",
  "logradouro",
  "numero",
  "bairro",
  "cidade",
  "estado",
  "tipos",
  "turnosAtendidos",
] as const;

const ADMINISTRATIVE_DEPENDENCIES: SchoolAdministrativeDependency[] = [
  "FEDERAL",
  "ESTADUAL",
  "MUNICIPAL",
  "PRIVADA",
  "FILANTROPICA",
  "COMUNITARIA",
];
const SCHOOL_TYPES: SchoolType[] = [
  "CRECHE",
  "PRE_ESCOLA",
  "FUNDAMENTAL",
  "MEDIO",
  "EJA",
  "TECNICO",
  "UNIVERSIDADE",
  "OUTRO",
];
const SCHOOL_SHIFTS: SchoolShift[] = ["MANHA", "TARDE", "INTEGRAL", "NOITE", "PERSONALIZADO"];

function splitList(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

export type ImportRow = Record<string, string>;

export interface MapRowResult {
  data?: CreateSchoolData;
  error?: string;
}

/** Converte uma linha bruta (CSV/Excel/JSON, todas normalizadas para `Record<string,string>`) em `CreateSchoolData`, ou retorna o motivo da rejeição. */
export function mapRowToCreateSchoolData(row: ImportRow): MapRowResult {
  for (const column of REQUIRED_COLUMNS) {
    if (!row[column] || !row[column].trim()) {
      return { error: `Coluna obrigatória "${column}" ausente ou vazia.` };
    }
  }
  // Presença já validada acima — leitura direta segura a partir daqui.
  const required = (key: (typeof REQUIRED_COLUMNS)[number]): string => row[key]!.trim();
  const optional = (key: string): string | undefined => row[key]?.trim() || undefined;

  const dependencia = required(
    "dependenciaAdministrativa",
  ).toUpperCase() as SchoolAdministrativeDependency;
  if (!ADMINISTRATIVE_DEPENDENCIES.includes(dependencia)) {
    return { error: `dependenciaAdministrativa inválida: "${row.dependenciaAdministrativa}".` };
  }

  const tipos = splitList(required("tipos")) as SchoolType[];
  if (tipos.length === 0 || tipos.some((tipo) => !SCHOOL_TYPES.includes(tipo))) {
    return { error: `tipos inválido: "${row.tipos}".` };
  }

  const turnosAtendidos = splitList(required("turnosAtendidos")) as SchoolShift[];
  if (
    turnosAtendidos.length === 0 ||
    turnosAtendidos.some((turno) => !SCHOOL_SHIFTS.includes(turno))
  ) {
    return { error: `turnosAtendidos inválido: "${row.turnosAtendidos}".` };
  }

  return {
    data: {
      codigoInterno: "", // preenchido por SchoolsService (sequência dedicada)
      codigoInep: optional("codigoInep"),
      nomeOficial: required("nomeOficial"),
      nomeFantasia: optional("nomeFantasia"),
      redeEnsino: optional("redeEnsino"),
      dependenciaAdministrativa: dependencia,
      cnpj: optional("cnpj"),
      telefone: optional("telefone"),
      whatsapp: optional("whatsapp"),
      email: optional("email"),
      website: optional("website"),
      cep: required("cep"),
      logradouro: required("logradouro"),
      numero: required("numero"),
      complemento: optional("complemento"),
      bairro: required("bairro"),
      cidade: required("cidade"),
      estado: required("estado").toUpperCase(),
      tipos,
      turnosAtendidos,
    },
  };
}

/** Parser CSV simples (RFC 4180 — vírgula, aspas duplas, campos com vírgula/quebra de linha escapados). */
export function parseCsvRows(content: string): ImportRow[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let insideQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (insideQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          insideQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      insideQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && content[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }

  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  if (!header) return [];
  return body.map((line) =>
    Object.fromEntries(header.map((key, index) => [key.trim(), line[index] ?? ""])),
  );
}

/**
 * Conversão segura para string de um valor de célula/JSON de origem
 * desconhecida — nunca `String(value)` puro em cima de um `unknown`
 * (viraria `"[object Object]"` para objetos ricos do `exceljs`, ex.
 * hyperlink/fórmula/rich text). Cobre os formatos de `CellValue` mais
 * comuns; qualquer outro objeto cai em `JSON.stringify`.
 */
function safeToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (typeof record.result === "string" || typeof record.result === "number") {
      return String(record.result);
    }
    if (Array.isArray(record.richText)) {
      return record.richText
        .map((part) =>
          typeof (part as { text?: unknown }).text === "string"
            ? (part as { text: string }).text
            : "",
        )
        .join("");
    }
    return JSON.stringify(value);
  }
  return "";
}

export function parseJsonRows(content: string): ImportRow[] {
  const parsed: unknown = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error("O JSON de importação deve ser um array de objetos.");
  }
  return parsed.map((item) => {
    const record = item as Record<string, unknown>;
    const row: ImportRow = {};
    for (const [key, value] of Object.entries(record)) {
      row[key] = Array.isArray(value) ? value.map(safeToString).join(";") : safeToString(value);
    }
    return row;
  });
}

export async function parseExcelRows(buffer: Buffer): Promise<ImportRow[]> {
  const workbook = new Workbook();
  // Atrito de tipos entre a `Buffer` genérica do @types/node instalado e a
  // assinatura ambiente de `exceljs` (mesmo valor em runtime, só
  // incompatível nominalmente no tipo — nenhum `any` escapa desta linha).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const header: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    header[colNumber - 1] = safeToString(cell.value).trim();
  });

  const rows: ImportRow[] = [];
  sheet.eachRow((sheetRow, rowNumber) => {
    if (rowNumber === 1) return;
    const row: ImportRow = {};
    let hasValue = false;
    sheetRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = header[colNumber - 1];
      if (!key) return;
      row[key] = safeToString(cell.value);
      if (row[key]) hasValue = true;
    });
    if (hasValue) rows.push(row);
  });
  return rows;
}
