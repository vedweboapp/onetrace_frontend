import type { UserAvailabilityDayKey, UserAvailabilityPayloadRow } from "@/features/users/types/user-availability.types";
import { USER_AVAILABILITY_DAYS } from "@/features/users/types/user-availability.types";
import { SCHEDULE_DAY_END_HOUR, SCHEDULE_DAY_START_HOUR } from "@/features/scheduling/utils/scheduling-time.util";
import { parseDateKey, toDateKey } from "@/features/scheduling/utils/scheduling-week.util";

const WEEKDAY_FROM_SUNDAY: UserAvailabilityDayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export type AvailabilityWindow = {
  startMinutes: number;
  endMinutes: number;
};

export function weekdayKeyFromDate(date: Date): UserAvailabilityDayKey {
  return WEEKDAY_FROM_SUNDAY[date.getDay()] ?? "monday";
}

export function timeToMinutes(value: string | null | undefined): number | null {
  const m = value?.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return Math.max(0, Math.min(24 * 60, hours * 60 + minutes));
}

export function minutesToTime(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(total)));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function snapMinutes(total: number, step = 15): number {
  return Math.round(total / step) * step;
}

export function getDayAvailabilityWindow(
  availableDays: UserAvailabilityPayloadRow[] | null | undefined,
  date: Date,
): AvailabilityWindow | null {
  if (!Array.isArray(availableDays) || availableDays.length === 0) return null;
  const key = weekdayKeyFromDate(date);
  const row = availableDays.find((item) => item.day === key);
  if (!row) return null;
  const startMinutes = timeToMinutes(row.start_time);
  const endMinutes = timeToMinutes(row.end_time);
  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) return null;
  return { startMinutes, endMinutes };
}

export function hasAvailabilityData(availableDays: UserAvailabilityPayloadRow[] | null | undefined): boolean {
  return Array.isArray(availableDays) && availableDays.length > 0;
}

export function availabilityBandPct(
  window: AvailabilityWindow | null,
  startHour = SCHEDULE_DAY_START_HOUR,
  endHour = SCHEDULE_DAY_END_HOUR,
): { leftPct: number; widthPct: number } | null {
  if (!window) return null;
  const timelineStart = startHour * 60;
  const timelineEnd = endHour * 60;
  const total = timelineEnd - timelineStart;
  if (total <= 0) return null;
  const start = Math.max(timelineStart, Math.min(timelineEnd, window.startMinutes));
  const end = Math.max(start, Math.min(timelineEnd, window.endMinutes));
  if (end <= start) return null;
  return {
    leftPct: ((start - timelineStart) / total) * 100,
    widthPct: ((end - start) / total) * 100,
  };
}

export function minutesBandPct(
  startMinutes: number,
  endMinutes: number,
  startHour = SCHEDULE_DAY_START_HOUR,
  endHour = SCHEDULE_DAY_END_HOUR,
): { leftPct: number; widthPct: number } {
  const timelineStart = startHour * 60;
  const timelineEnd = endHour * 60;
  const total = Math.max(1, timelineEnd - timelineStart);
  const start = Math.max(timelineStart, Math.min(timelineEnd, Math.min(startMinutes, endMinutes)));
  const end = Math.max(start + 15, Math.min(timelineEnd, Math.max(startMinutes, endMinutes)));
  return {
    leftPct: ((start - timelineStart) / total) * 100,
    widthPct: ((end - start) / total) * 100,
  };
}

export function pointerToMinutes(
  clientX: number,
  track: HTMLElement,
  startHour = SCHEDULE_DAY_START_HOUR,
  endHour = SCHEDULE_DAY_END_HOUR,
): number {
  const rect = track.getBoundingClientRect();
  const ratio = rect.width <= 0 ? 0 : Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const timelineStart = startHour * 60;
  const timelineEnd = endHour * 60;
  return snapMinutes(timelineStart + ratio * (timelineEnd - timelineStart));
}

export type DayTimeSegmentKind = "available" | "unavailable" | "scheduled" | "timeoff" | "free";

export type DayTimeSegment<TSchedule = unknown, TTimeOff = unknown> = {
  startMinutes: number;
  endMinutes: number;
  kind: DayTimeSegmentKind;
  schedule?: TSchedule;
  timeOff?: TTimeOff;
};

export function formatMinutesLabel(totalMinutes: number, locale: string): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: minutes === 0 ? undefined : "2-digit",
  }).format(new Date(2000, 0, 1, hours, minutes));
}

export function formatMinutesRange(startMinutes: number, endMinutes: number, locale: string): string {
  return `${formatMinutesLabel(startMinutes, locale)} – ${formatMinutesLabel(endMinutes, locale)}`;
}

export function buildDayTimeSegments<TSchedule extends { start_at: string; end_at: string }, TTimeOff extends { start_at: string; end_at: string }>(input: {
  dayKey: string;
  window: AvailabilityWindow | null;
  knownAvailability: boolean;
  schedules: TSchedule[];
  timeOffs: TTimeOff[];
  spanStartMinutes?: number;
  spanEndMinutes?: number;
}): DayTimeSegment<TSchedule, TTimeOff>[] {
  const scheduleRanges = input.schedules
    .map((row) => {
      const range = blockRangeOnDay(row.start_at, row.end_at, input.dayKey);
      return range ? { ...range, row } : null;
    })
    .filter((row): row is OccupiedRange & { row: TSchedule } => row != null);
  const timeOffRanges = input.timeOffs
    .map((row) => {
      const range = blockRangeOnDay(row.start_at, row.end_at, input.dayKey);
      return range ? { ...range, row } : null;
    })
    .filter((row): row is OccupiedRange & { row: TTimeOff } => row != null);

  const points = new Set<number>();
  if (input.spanStartMinutes != null) points.add(input.spanStartMinutes);
  if (input.spanEndMinutes != null) points.add(input.spanEndMinutes);
  if (input.knownAvailability && input.window) {
    points.add(input.window.startMinutes);
    points.add(input.window.endMinutes);
  }
  for (const range of scheduleRanges) {
    points.add(range.startMinutes);
    points.add(range.endMinutes);
  }
  for (const range of timeOffRanges) {
    points.add(range.startMinutes);
    points.add(range.endMinutes);
  }

  if (points.size < 2) {
    if (input.knownAvailability && !input.window) {
      return [{
        startMinutes: SCHEDULE_DAY_START_HOUR * 60,
        endMinutes: SCHEDULE_DAY_END_HOUR * 60,
        kind: "unavailable",
      }];
    }
    return [];
  }

  const sorted = [...points].sort((a, b) => a - b);
  const segments: DayTimeSegment<TSchedule, TTimeOff>[] = [];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const startMinutes = sorted[i]!;
    const endMinutes = sorted[i + 1]!;
    if (endMinutes <= startMinutes) continue;
    const mid = (startMinutes + endMinutes) / 2;
    const schedule = scheduleRanges.find((range) => mid >= range.startMinutes && mid < range.endMinutes)?.row;
    if (schedule) {
      pushOrMerge(segments, { startMinutes, endMinutes, kind: "scheduled", schedule });
      continue;
    }
    const timeOff = timeOffRanges.find((range) => mid >= range.startMinutes && mid < range.endMinutes)?.row;
    if (timeOff) {
      pushOrMerge(segments, { startMinutes, endMinutes, kind: "timeoff", timeOff });
      continue;
    }
    if (!input.knownAvailability) {
      pushOrMerge(segments, { startMinutes, endMinutes, kind: "free" });
      continue;
    }
    if (!input.window || mid < input.window.startMinutes || mid >= input.window.endMinutes) {
      pushOrMerge(segments, { startMinutes, endMinutes, kind: "unavailable" });
      continue;
    }
    pushOrMerge(segments, { startMinutes, endMinutes, kind: "available" });
  }

  return segments;
}

function pushOrMerge<TSchedule, TTimeOff>(
  segments: DayTimeSegment<TSchedule, TTimeOff>[],
  next: DayTimeSegment<TSchedule, TTimeOff>,
): void {
  const prev = segments[segments.length - 1];
  if (
    prev &&
    prev.kind === next.kind &&
    prev.schedule === next.schedule &&
    prev.timeOff === next.timeOff &&
    prev.endMinutes === next.startMinutes
  ) {
    prev.endMinutes = next.endMinutes;
    return;
  }
  segments.push(next);
}

export function visibleHourBoundsFromSegments(
  segments: DayTimeSegment[],
  fallbackStartHour = 9,
  fallbackEndHour = 17,
): { startHour: number; endHour: number } {
  if (segments.length === 0) {
    return { startHour: fallbackStartHour, endHour: fallbackEndHour };
  }
  const startHour = Math.max(0, Math.floor(Math.min(...segments.map((row) => row.startMinutes)) / 60));
  const endHour = Math.min(24, Math.max(startHour + 1, Math.ceil(Math.max(...segments.map((row) => row.endMinutes)) / 60)));
  return { startHour, endHour };
}

export function formatAvailabilityHours(window: AvailabilityWindow, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  const start = new Date(2000, 0, 1, Math.floor(window.startMinutes / 60), window.startMinutes % 60);
  const end = new Date(2000, 0, 1, Math.floor(window.endMinutes / 60), window.endMinutes % 60);
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export function isValidAvailabilityDay(day: string): day is UserAvailabilityDayKey {
  return (USER_AVAILABILITY_DAYS as readonly string[]).includes(day);
}

export type OccupiedRange = {
  startMinutes: number;
  endMinutes: number;
};

export type AvailabilityTone = "available" | "unavailable" | "timeoff" | "unknown";

export function isoOverlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const a0 = new Date(aStart).getTime();
  const a1 = new Date(aEnd).getTime();
  const b0 = new Date(bStart).getTime();
  const b1 = new Date(bEnd).getTime();
  if (![a0, a1, b0, b1].every(Number.isFinite)) return false;
  return a0 < b1 && a1 > b0;
}

export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function blockRangeOnDay(
  startAt: string,
  endAt: string,
  dayKey: string,
): OccupiedRange | null {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const dayStart = parseDateKey(dayKey);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const clipStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
  const clipEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));
  if (clipEnd.getTime() <= clipStart.getTime()) return null;
  const startMinutes = (clipStart.getTime() - dayStart.getTime()) / 60_000;
  const endMinutes = (clipEnd.getTime() - dayStart.getTime()) / 60_000;
  return { startMinutes, endMinutes };
}

export function occupiedRangesForDay(
  items: { start_at: string; end_at: string }[],
  dayKey: string,
): OccupiedRange[] {
  const ranges: OccupiedRange[] = [];
  for (const item of items) {
    const range = blockRangeOnDay(item.start_at, item.end_at, dayKey);
    if (range) ranges.push(range);
  }
  return ranges;
}

export function isRangeFree(startMinutes: number, endMinutes: number, occupied: OccupiedRange[]): boolean {
  return !occupied.some((range) => rangesOverlap(startMinutes, endMinutes, range.startMinutes, range.endMinutes));
}

export function isRangeWithinAvailability(
  startMinutes: number,
  endMinutes: number,
  window: AvailabilityWindow | null,
  knownAvailability: boolean,
): boolean {
  if (!knownAvailability || !window) return false;
  return startMinutes >= window.startMinutes && endMinutes <= window.endMinutes;
}

export function hasFreeBookableSlot(
  window: AvailabilityWindow | null,
  knownAvailability: boolean,
  occupied: OccupiedRange[],
  minMinutes = 30,
): boolean {
  if (!knownAvailability || !window) return false;
  const start = window.startMinutes;
  const end = window.endMinutes;
  if (end - start < minMinutes) return false;
  const ranges = [...occupied].sort((a, b) => a.startMinutes - b.startMinutes);
  let cursor = start;
  for (const range of ranges) {
    if (range.endMinutes <= cursor) continue;
    if (range.startMinutes - cursor >= minMinutes) return true;
    cursor = Math.max(cursor, range.endMinutes);
    if (cursor >= end) return false;
  }
  return end - cursor >= minMinutes;
}

export function minuteIsBookable(
  minute: number,
  window: AvailabilityWindow | null,
  knownAvailability: boolean,
  occupied: OccupiedRange[],
): boolean {
  if (!isRangeWithinAvailability(minute, minute + 15, window, knownAvailability)) return false;
  return isRangeFree(minute, minute + 15, occupied);
}

export function hourTone(
  hour: number,
  window: AvailabilityWindow | null,
  knownAvailability: boolean,
  timeOffRanges: OccupiedRange[] = [],
): AvailabilityTone {
  const hourStart = hour * 60;
  const hourEnd = hourStart + 60;
  if (timeOffRanges.some((range) => rangesOverlap(hourStart, hourEnd, range.startMinutes, range.endMinutes))) {
    return "timeoff";
  }
  if (!knownAvailability) return "unknown";
  if (!window) return "unavailable";
  if (hourEnd <= window.startMinutes || hourStart >= window.endMinutes) return "unavailable";
  return "available";
}

export function dayTone(
  window: AvailabilityWindow | null,
  knownAvailability: boolean,
  timeOffRanges: OccupiedRange[] = [],
): AvailabilityTone {
  if (timeOffRanges.length > 0) {
    if (!window || !knownAvailability) return "timeoff";
    const coversWindow = timeOffRanges.some(
      (range) => range.startMinutes <= window.startMinutes && range.endMinutes >= window.endMinutes,
    );
    if (coversWindow) return "timeoff";
  }
  if (!knownAvailability) return "unknown";
  if (!window) return "unavailable";
  return "available";
}

export function mergeTones(tones: AvailabilityTone[]): AvailabilityTone {
  if (tones.length === 0) return "unknown";
  if (tones.includes("available")) return "available";
  if (tones.every((tone) => tone === "unavailable")) return "unavailable";
  if (tones.includes("timeoff") && tones.every((tone) => tone === "timeoff" || tone === "unavailable")) {
    return "timeoff";
  }
  if (tones.every((tone) => tone === "unknown")) return "unknown";
  if (tones.includes("unavailable") && !tones.includes("available")) return "unavailable";
  return "unknown";
}

/** Color a shared day only when every worker has the same availability. */
export function mergeTonesUnanimous(tones: AvailabilityTone[]): AvailabilityTone {
  if (tones.length === 0) return "unknown";
  const unique = new Set(tones);
  if (unique.size === 1) return tones[0]!;
  if (tones.every((tone) => tone === "unavailable" || tone === "timeoff")) {
    return tones.includes("timeoff") ? "timeoff" : "unavailable";
  }
  return "unknown";
}

export function availabilityToneClass(tone: AvailabilityTone, strong = false): string {
  if (tone === "available") {
    return strong
      ? "bg-emerald-200/90 text-emerald-900 dark:bg-emerald-900/70 dark:text-emerald-100"
      : "bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-200";
  }
  if (tone === "unavailable") {
    return strong
      ? "bg-slate-300/90 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
      : "bg-slate-200/80 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400";
  }
  if (tone === "timeoff") {
    return strong
      ? "bg-amber-200/90 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100"
      : "bg-amber-100/80 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
  }
  return "";
}

/** Thin top accent on week/day column headers. Unknown days stay uncolored. */
export function availabilityHeaderBarClass(tone: AvailabilityTone): string {
  if (tone === "available") return "bg-emerald-400 dark:bg-emerald-500";
  if (tone === "unavailable") return "bg-slate-300 dark:bg-slate-600";
  if (tone === "timeoff") return "bg-amber-400 dark:bg-amber-500";
  return "bg-transparent";
}

export function toDateKeysInclusive(startIso: string, endIso: string): string[] {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= last) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}
