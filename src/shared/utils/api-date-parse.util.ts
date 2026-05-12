/**
 * Parses API date strings that may be date-only (`YYYY-MM-DD`) or full ISO (`2026-05-13T00:00:00Z`).
 * Date-only values use noon local time to reduce timezone boundary issues when formatting as a calendar day.
 */
export function parseFlexibleApiDate(raw: string | null | undefined): Date | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  if (s.includes("T")) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const day = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const d = new Date(`${day}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatFlexibleApiDate(raw: string | null | undefined, fmt: Intl.DateTimeFormat): string {
  const d = parseFlexibleApiDate(raw);
  return d ? fmt.format(d) : "—";
}

/** Value for `<input type="date" />` from API strings (date-only or ISO datetime). */
export function formatApiDateForHtmlDateInput(raw: string | null | undefined): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const head = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
  const d = parseFlexibleApiDate(s);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
