/** Parse a plain numeric string/number (cost, markup, sell, etc.). */
export function parseLabourNumber(raw: string | number | null | undefined): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const n = Number.parseFloat(String(raw ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Parse labour time for UI display/edit as decimal hours.
 * Accepts plain hours (`2`, `"1.5"`) or API DurationField strings (`02:00:00`, `1:30`).
 */
export function parseLabourTimeHours(raw: string | number | null | undefined): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw >= 0 ? raw : 0;
  const s = String(raw ?? "").trim();
  if (!s) return 0;

  // Plain decimal hours (what the form edits).
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number.parseFloat(s);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  // Django DurationField: [N day[s], ]hh:mm[:ss[.uuuuuu]]
  const dayMatch = s.match(/^(\d+)\s+days?,\s*(.+)$/i);
  const timePart = dayMatch ? dayMatch[2].trim() : s;
  const days = dayMatch ? Number.parseInt(dayMatch[1], 10) : 0;

  const timeMatch = timePart.match(/^(\d+):(\d{1,2})(?::(\d{1,2})(?:\.\d+)?)?$/);
  if (timeMatch) {
    const h = Number.parseInt(timeMatch[1], 10);
    const m = Number.parseInt(timeMatch[2], 10);
    const sec = timeMatch[3] ? Number.parseInt(timeMatch[3], 10) : 0;
    if (![h, m, sec, days].every((n) => Number.isFinite(n) && n >= 0)) return 0;
    return days * 24 + h + m / 60 + sec / 3600;
  }

  const fallback = Number.parseFloat(s);
  return Number.isFinite(fallback) && fallback >= 0 ? fallback : 0;
}

/** Convert decimal hours to API DurationField `hh:mm:ss` (e.g. 2 → `02:00:00`). */
export function labourHoursToApiDuration(hours: number): string {
  const safe = Number.isFinite(hours) && hours > 0 ? hours : 0;
  const totalSeconds = Math.round(safe * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function suggestedLabourSellPrice(costRate: number, markupPct: number): number {
  if (!Number.isFinite(costRate) || !Number.isFinite(markupPct)) return 0;
  return Math.round(costRate * (1 + markupPct / 100) * 100) / 100;
}
