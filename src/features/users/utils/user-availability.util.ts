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

export function normalizeUserAvailabilityFromApi(
  rows: UserAvailabilityPayloadRow[] | null | undefined,
): UserAvailabilityFormRow[] {
  const defaults = defaultUserAvailabilityRows();
  if (!Array.isArray(rows) || rows.length === 0) return defaults;
  const byDay = new Map<UserAvailabilityDayKey, UserAvailabilityPayloadRow>();
  for (const row of rows) {
    if (USER_AVAILABILITY_DAYS.includes(row.day)) byDay.set(row.day, row);
  }
  return defaults.map((row) => {
    const match = byDay.get(row.day);
    if (!match) return { ...row, enabled: false };
    return {
      day: row.day,
      enabled: true,
      start_time: match.start_time?.slice(0, 5) || row.start_time,
      end_time: match.end_time?.slice(0, 5) || row.end_time,
    };
  });
}
