/** Day timeline configuration (local hours, end is exclusive — 24 = midnight). */
export const SCHEDULE_DAY_START_HOUR = 6;
export const SCHEDULE_DAY_END_HOUR = 24;

export function buildDayHourLabels(startHour = SCHEDULE_DAY_START_HOUR, endHour = SCHEDULE_DAY_END_HOUR): number[] {
  const hours: number[] = [];
  for (let h = startHour; h < endHour; h += 1) hours.push(h);
  return hours;
}

export function formatHourLabel(hour: number, locale: string): string {
  const normalized = ((hour % 24) + 24) % 24;
  const d = new Date(2000, 0, 1, normalized, 0);
  return new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(d);
}

/** Split hour + AM/PM so day-view column headers stay readable in narrow cells. */
export function formatHourParts(hour: number, locale: string): { time: string; period: string | null } {
  const normalized = ((hour % 24) + 24) % 24;
  const d = new Date(2000, 0, 1, normalized, 0);
  const parts = new Intl.DateTimeFormat(locale, { hour: "numeric" }).formatToParts(d);
  const time = parts.find((part) => part.type === "hour")?.value ?? String(normalized);
  const period = parts.find((part) => part.type === "dayPeriod")?.value ?? null;
  return { time, period };
}

export function minutesFromDayStart(iso: string, startHour = SCHEDULE_DAY_START_HOUR): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return (d.getHours() - startHour) * 60 + d.getMinutes();
}

export function scheduleTimelineSpan(
  startAt: string,
  endAt: string,
  startHour = SCHEDULE_DAY_START_HOUR,
  endHour = SCHEDULE_DAY_END_HOUR,
): { leftPct: number; widthPct: number } {
  const totalMinutes = (endHour - startHour) * 60;
  if (totalMinutes <= 0) return { leftPct: 0, widthPct: 100 };

  const startMin = Math.max(0, minutesFromDayStart(startAt, startHour));
  const endMin = Math.min(totalMinutes, Math.max(startMin + 15, minutesFromDayStart(endAt, startHour)));
  const leftPct = (startMin / totalMinutes) * 100;
  const widthPct = ((endMin - startMin) / totalMinutes) * 100;
  return { leftPct, widthPct: Math.max(widthPct, 3) };
}

export function formatDurationHours(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const hrs = Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
  const rounded = Math.round(hrs * 10) / 10;
  return `${rounded}h`;
}
