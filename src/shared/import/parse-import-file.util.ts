import type { ParsedImportFile } from "./types";

export const IMPORT_ACCEPT =
  ".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

export const IMPORT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const EXCEL_EXT = /\.(xlsx|xls)$/i;
const CSV_EXT = /\.csv$/i;

export function isSupportedImportFile(file: File): boolean {
  const name = file.name || "";
  return EXCEL_EXT.test(name) || CSV_EXT.test(name);
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell.trim());
      cell = "";
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      continue;
    }
    if (ch === "\r") continue;
    cell += ch;
  }

  row.push(cell.trim());
  if (row.some((c) => c.length > 0)) rows.push(row);
  return rows;
}

function uniqueColumnNames(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((raw, index) => {
    const base = raw.trim() || `Column ${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

function fromMatrix(file: File, matrix: unknown[][]): ParsedImportFile {
  if (matrix.length === 0) {
    throw new Error("empty");
  }
  const headerRow = (matrix[0] ?? []).map(cellToString);
  const columns = uniqueColumnNames(headerRow);
  const dataRows = matrix.slice(1).filter((r) =>
    (r ?? []).some((c) => cellToString(c).length > 0),
  );
  const sampleSource = dataRows[0] ?? [];
  const sampleRow = columns.map((_, i) => cellToString(sampleSource[i]));

  return {
    file,
    columns,
    sampleRow,
    rowCount: dataRows.length,
  };
}

async function parseExcelFile(file: File): Promise<ParsedImportFile> {
  // Turbopack / bundler compatible import for client components
  // @ts-ignore
  const xlsxModule = await import("xlsx/xlsx.mjs").catch(() => import("xlsx"));
  const XLSX = (xlsxModule as any).default || xlsxModule;
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("empty");
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("empty");
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  return fromMatrix(file, matrix);
}

async function parseCsvFile(file: File): Promise<ParsedImportFile> {
  const text = await file.text();
  const matrix = parseCsvText(text);
  return fromMatrix(file, matrix);
}

export async function parseImportFile(file: File): Promise<ParsedImportFile> {
  if (file.size > IMPORT_MAX_BYTES) {
    throw new Error("too_large");
  }
  if (!isSupportedImportFile(file)) {
    throw new Error("unsupported");
  }
  if (EXCEL_EXT.test(file.name)) {
    return parseExcelFile(file);
  }
  return parseCsvFile(file);
}
