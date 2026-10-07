/** Parse a plain numeric string/number (cost, markup, sell, etc.). */
export function parseItemNumber(raw: string | number | null | undefined): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const n = Number.parseFloat(String(raw ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

/** Suggest selling price from cost and markup percentage. */
export function suggestedItemSellPrice(cost: number, markupPct: number): number {
  if (!Number.isFinite(cost) || !Number.isFinite(markupPct)) return 0;
  return Math.round(cost * (1 + markupPct / 100) * 100) / 100;
}
