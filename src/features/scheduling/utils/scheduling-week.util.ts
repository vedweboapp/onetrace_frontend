/** Week / day helpers for the Scheduling calendar grid. */

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday-start week containing `anchor`. */
export function startOfWeekMonday(anchor: Date): Date {
  const day = startOfLocalDay(anchor);
  const weekday = day.getDay(); // 0 Sun … 6 Sat
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addDays(day, offset);
}

export function buildWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map((p) => Number.parseInt(p, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatWeekRangeLabel(weekStart: Date, locale: string): string {
  const weekEnd = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const fmt = new Intl.DateTimeFormat(locale, opts);
  return `${fmt.format(weekStart)} – ${fmt.format(weekEnd)}`;
}

export function formatDayHeader(d: Date, locale: string, todayLabel: string): string {
  if (isSameLocalDay(d, new Date())) {
    const dayPart = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(d);
    return `${todayLabel}, ${dayPart}`;
  }
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatWeekdayShort(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
}

export function formatMonthDay(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(d);
}

/** Extract YYYY-MM-DD from an API datetime / date string. */
export function apiDateToKey(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const m = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1] ?? null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return toDateKey(d);
}

export function formatTimeRange(
  startRaw: string | null | undefined,
  endRaw: string | null | undefined,
  locale: string,
): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  const start = startRaw ? new Date(startRaw) : null;
  const end = endRaw ? new Date(endRaw) : null;
  const startOk = start && !Number.isNaN(start.getTime());
  const endOk = end && !Number.isNaN(end.getTime());
  if (startOk && endOk) return `${fmt.format(start)} – ${fmt.format(end)}`;
  if (startOk) return fmt.format(start);
  return "—";
}

export function splitApiDateTime(raw: string | null | undefined): { date: string; time: string } {
  if (!raw?.trim()) return { date: "", time: "" };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const m = raw.trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
    if (m) return { date: m[1] ?? "", time: m[2] ?? "" };
    return { date: "", time: "" };
  }
  const date = toDateKey(d);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

export function combineDateAndTimeToIso(date: string, time: string, allDay: boolean): string {
  const t = allDay ? "00:00" : time.trim() || "00:00";
  const local = new Date(`${date.trim()}T${t}:00`);
  if (Number.isNaN(local.getTime())) return `${date.trim()}T${t}:00.000Z`;
  return local.toISOString();
}

export function combineDateAndTimeEndToIso(date: string, time: string, allDay: boolean): string {
  const t = allDay ? "23:59" : time.trim() || "23:59";
  const local = new Date(`${date.trim()}T${t}:00`);
  if (Number.isNaN(local.getTime())) return `${date.trim()}T${t}:00.000Z`;
  return local.toISOString();
}
