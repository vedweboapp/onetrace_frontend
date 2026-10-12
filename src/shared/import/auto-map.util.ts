import type { ImportFieldDef } from "./types";

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value: string): string {
  return normalizeToken(value).replace(/\s+/g, "");
}

/** Score how well a file column matches a module field (higher = better). */
function matchScore(fileColumn: string, field: ImportFieldDef): number {
  const col = normalizeToken(fileColumn);
  const colCompact = compact(fileColumn);
  const key = normalizeToken(field.key.replace(/_/g, " "));
  const keyCompact = compact(field.key);
  const label = normalizeToken(field.label);
  const labelCompact = compact(field.label);

  if (!col) return 0;
  if (col === label || colCompact === labelCompact) return 100;
  if (col === key || colCompact === keyCompact) return 95;
  if (colCompact.includes(labelCompact) || labelCompact.includes(colCompact)) return 80;
  if (colCompact.includes(keyCompact) || keyCompact.includes(colCompact)) return 75;

  const colParts = new Set(col.split(" "));
  const labelParts = label.split(" ").filter(Boolean);
  const keyParts = key.split(" ").filter(Boolean);
  let hits = 0;
  for (const p of labelParts) if (colParts.has(p)) hits += 1;
  for (const p of keyParts) if (colParts.has(p)) hits += 1;
  if (hits === 0) return 0;
  return 40 + hits * 10;
}

/**
 * Auto-map file columns → module fields (1:1).
 * Returns map of fileColumn → moduleFieldKey (or empty string if unmapped).
 */
export function autoMapColumns(
  fileColumns: string[],
  fields: ImportFieldDef[],
): Record<string, string> {
  const remaining = new Set(fields.map((f) => f.key));
  const pairs: Array<{ fileColumn: string; fieldKey: string; score: number }> = [];

  for (const col of fileColumns) {
    for (const field of fields) {
      const score = matchScore(col, field);
      if (score >= 40) pairs.push({ fileColumn: col, fieldKey: field.key, score });
    }
  }

  pairs.sort((a, b) => b.score - a.score);

  const result: Record<string, string> = {};
  for (const col of fileColumns) result[col] = "";

  const usedColumns = new Set<string>();
  for (const pair of pairs) {
    if (usedColumns.has(pair.fileColumn)) continue;
    if (!remaining.has(pair.fieldKey)) continue;
    result[pair.fileColumn] = pair.fieldKey;
    usedColumns.add(pair.fileColumn);
    remaining.delete(pair.fieldKey);
  }

  return result;
}
