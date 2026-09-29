import type {
  UserAvailabilityDayKey,
  UserAvailabilityFormRow,
  UserAvailabilityPayloadRow,
} from "@/features/users/types/user-availability.types";
import { USER_AVAILABILITY_DAYS } from "@/features/users/types/user-availability.types";

export function defaultUserAvailabilityRows(): UserAvailabilityFormRow[] {
  return USER_AVAILABILITY_DAYS.map((day) => ({
    day,
    enabled: day !== "saturday" && day !== "sunday",
    start_time: "09:00",
    end_time: "17:00",
  }));
}

export function mapUserAvailabilityToPayload(rows: UserAvailabilityFormRow[]): UserAvailabilityPayloadRow[] {
  return rows
    .filter((row) => row.enabled)
    .map((row) => ({
      day: row.day,
      start_time: row.start_time.trim(),
      end_time: row.end_time.trim(),
    }))
    .filter((row) => row.start_time && row.end_time);
}

const DAY_ALIASES: Record<string, UserAvailabilityDayKey> = {
  monday: "monday",
  mon: "monday",
  tuesday: "tuesday",
  tue: "tuesday",
  tues: "tuesday",
  wednesday: "wednesday",
  wed: "wednesday",
  thursday: "thursday",
  thu: "thursday",
  thur: "thursday",
  thurs: "thursday",
  friday: "friday",
  fri: "friday",
  saturday: "saturday",
  sat: "saturday",
  sunday: "sunday",
  sun: "sunday",
};

/** ISO weekday 1–7 (Monday=1). */
const ISO_DAY_INDEX: UserAvailabilityDayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function parseAvailabilityDayKey(raw: unknown): UserAvailabilityDayKey | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw >= 1 && raw <= 7) return ISO_DAY_INDEX[raw - 1] ?? null;
    return null;
  }
  const key = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!key) return null;
  return DAY_ALIASES[key] ?? null;
}

export function parseAvailabilityTime(raw: unknown): string | null {
  if (raw == null) return null;
  const match = String(raw)
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || hours < 0 || hours > 24 || minutes < 0 || minutes > 59) return null;
  if (hours === 24 && minutes !== 0) return null;
  return `${String(Math.min(hours, 24)).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function isAvailabilityDisabled(row: Record<string, unknown>): boolean {
  if (row.is_available === false || row.available === false || row.enabled === false) return true;
  if (row.is_available === "false" || row.available === "false" || row.enabled === "false") return true;
  return false;
}

/** Normalize API `available_days` from list/detail into calendar rows. */
export function parseUserAvailabilityRows(raw: unknown): UserAvailabilityPayloadRow[] {
  let value = raw;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const byDay = new Map<UserAvailabilityDayKey, UserAvailabilityPayloadRow>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (isAvailabilityDisabled(row)) continue;
    const day = parseAvailabilityDayKey(row.day ?? row.day_name ?? row.weekday ?? row.week_day);
    const start_time = parseAvailabilityTime(row.start_time ?? row.start ?? row.from);
    const end_time = parseAvailabilityTime(row.end_time ?? row.end ?? row.to);
    if (!day || !start_time || !end_time) continue;
    if (end_time <= start_time) continue;
    byDay.set(day, { day, start_time, end_time });
  }
  return USER_AVAILABILITY_DAYS.map((day) => byDay.get(day)).filter(
    (row): row is UserAvailabilityPayloadRow => row != null,
  );
}

export function normalizeUserAvailabilityFromApi(
  rows: UserAvailabilityPayloadRow[] | null | undefined,
): UserAvailabilityFormRow[] {
  const defaults = defaultUserAvailabilityRows();
  const parsed = parseUserAvailabilityRows(rows);
  if (parsed.length === 0) return defaults;
  const byDay = new Map(parsed.map((row) => [row.day, row]));
  return defaults.map((row) => {
    const match = byDay.get(row.day);
    if (!match) return { ...row, enabled: false };
    return {
      day: row.day,
      enabled: true,
      start_time: match.start_time || row.start_time,
      end_time: match.end_time || row.end_time,
    };
  });
}
