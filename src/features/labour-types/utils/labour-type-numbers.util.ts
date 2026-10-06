export function parseLabourNumber(raw: string | number | null | undefined): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const n = Number.parseFloat(String(raw ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function suggestedLabourSellPrice(costRate: number, markupPct: number): number {
  if (!Number.isFinite(costRate) || !Number.isFinite(markupPct)) return 0;
  return Math.round(costRate * (1 + markupPct / 100) * 100) / 100;
}
