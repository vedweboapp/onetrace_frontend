import type { MassActionConfig, MassExportFormat, MassUpdateFieldDef, MassUpdatePayload } from "./types";
import { parseOrgMoneyInput } from "@/shared/money/format-money.util";
import { getOrgCurrencySettings } from "@/shared/money/org-currency.store";

type PaginatedFetch<T extends { id: number }> = (
  page: number,
  pageSize: number,
) => Promise<{ items: T[]; pagination: { total_pages: number } }>;

export async function fetchAllEntityIds<T extends { id: number }>(
  fetchPage: PaginatedFetch<T>,
  pageSize = 500,
): Promise<number[]> {
  const ids: number[] = [];
  let pageNum = 1;
  while (true) {
    const { items, pagination } = await fetchPage(pageNum, pageSize);
    for (const row of items) ids.push(row.id);
    if (pagination.total_pages === 0 || pageNum >= pagination.total_pages) break;
    pageNum += 1;
  }
  return ids;
}

export function buildMassIdsPayload(config: MassActionConfig, ids: number[]): Record<string, number[]> {
  return { [config.idsKey]: ids };
}

export function buildMassExportPayload(
  config: MassActionConfig,
  ids: number[],
  exportFormat: MassExportFormat,
): Record<string, unknown> {
  return {
    ...buildMassIdsPayload(config, ids),
    export_format: exportFormat,
  };
}

export function massExportFallbackFilename(stem: string | undefined, exportFormat: MassExportFormat): string {
  const base = stem?.trim() || "export";
  return `${base}.${exportFormat}`;
}

export function coerceMassFieldValue(field: MassUpdateFieldDef, raw: string): string | number | boolean {
  const trimmed = raw.trim();
  if (field.valueCoerce === "boolean") return trimmed === "true";
  if (field.valueCoerce === "number" || field.valueType === "number" || field.valueType === "money") {
    const n =
      field.valueType === "money"
        ? parseOrgMoneyInput(trimmed, getOrgCurrencySettings())
        : Number(trimmed);
    return Number.isFinite(n) ? n : trimmed;
  }
  if (field.valueType === "select" && /^\d+$/.test(trimmed)) {
    const n = Number.parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : trimmed;
  }
  return trimmed;
}

function formatMassFieldForApi(
  field: MassUpdateFieldDef | undefined,
  coerced: string | number | boolean,
): string | number | boolean {
  if (!field?.valueFormat || typeof coerced !== "string") return coerced;
  const trimmed = coerced.trim();
  if (!trimmed) return trimmed;
  if (field.valueFormat === "datetime-iso") {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? trimmed : d.toISOString();
  }
  if (field.valueFormat === "date-iso") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? trimmed : d.toISOString().slice(0, 10);
  }
  return coerced;
}

export function buildMassUpdatePayload(
  config: MassActionConfig,
  ids: number[],
  fieldName: string,
  fieldValue: string,
  fields: MassUpdateFieldDef[],
): MassUpdatePayload {
  const field = fields.find((f) => f.name === fieldName);
  const coerced = field ? coerceMassFieldValue(field, fieldValue) : fieldValue;
  const apiValue = formatMassFieldForApi(field, coerced);
  return {
    ...buildMassIdsPayload(config, ids),
    field_name: fieldName,
    field_value: apiValue,
  };
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function filenameFromContentDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(header);
  if (!match?.[1]) return fallback;
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim() || fallback;
  }
}
