/** Parse a plain numeric string/number (cost, markup, sell, etc.). */
export function parseItemNumber(raw: string | number | null | undefined): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const n = Number.parseFloat(String(raw ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Catalog default markup % (`default_markup`), with legacy `markup` fallback.
 * Quote lines may raise markup above this but must not go below it.
 */
export function resolveItemDefaultMarkup(
  item: { default_markup?: string | number | null; markup?: string | number | null } | null | undefined,
): number {
  if (item == null) return 0;
  if (item.default_markup != null && String(item.default_markup).trim() !== "") {
    return parseItemNumber(item.default_markup);
  }
  return parseItemNumber(item.markup);
}

/** Suggest selling price from cost and markup percentage. */
export function suggestedItemSellPrice(cost: number, markupPct: number): number {
  if (!Number.isFinite(cost) || !Number.isFinite(markupPct)) return 0;
  return Math.round(cost * (1 + markupPct / 100) * 100) / 100;
}
