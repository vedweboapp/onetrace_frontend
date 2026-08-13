import { fetchUserProfile, fetchUsersPage } from "@/features/users/api/user.api";
import type { UserAvailabilityPayloadRow } from "@/features/users/types/user-availability.types";
import type { UserProfile } from "@/features/users/types/user.types";
import {
  resolveUserProfileSelectId,
  userProfileSelectLabel,
} from "@/features/users/utils/load-users-by-role.util";
import { isValidAvailabilityDay } from "@/features/scheduling/utils/scheduling-availability.util";

export type SchedulingTechnician = {
  id: number;
  profileId: number;
  name: string;
  title: string;
  initials: string;
  searchText: string;
  availableDays: UserAvailabilityPayloadRow[];
};

function resolveUserAvailableDays(user: UserProfile): UserAvailabilityPayloadRow[] {
  const source = user.available_days ?? user.user_detail?.available_days ?? null;
  if (!Array.isArray(source)) return [];
  const rows: UserAvailabilityPayloadRow[] = [];
  for (const row of source) {
    if (!row || !isValidAvailabilityDay(row.day)) continue;
    const start_time = String(row.start_time ?? "").slice(0, 5);
    const end_time = String(row.end_time ?? "").slice(0, 5);
    if (!start_time || !end_time) continue;
    rows.push({ day: row.day, start_time, end_time });
  }
  return rows;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

async function enrichMissingAvailability(users: UserProfile[]): Promise<UserProfile[]> {
  const missing = users.filter((user) => resolveUserAvailableDays(user).length === 0);
  if (missing.length === 0) return users;
  const details = await Promise.all(
    missing.slice(0, 80).map((user) => fetchUserProfile(user.id).catch(() => null)),
  );
  const byId = new Map<number, UserProfile>();
  for (const detail of details) {
    if (detail) byId.set(detail.id, detail);
  }
  if (byId.size === 0) return users;
  return users.map((user) => byId.get(user.id) ?? user);
}

export async function loadSchedulingTechnicians(fallbackTitle: string): Promise<SchedulingTechnician[]> {
  const { items } = await fetchUsersPage(1, 500);
  const enriched = await enrichMissingAvailability(items);
  const seen = new Set<number>();
  const rows: SchedulingTechnician[] = [];
  for (const user of enriched) {
    const id = resolveUserProfileSelectId(user);
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    const name = userProfileSelectLabel(user);
    const title =
      user.role_detail?.role_name?.trim() ||
      user.role_detail?.name?.trim() ||
      fallbackTitle;
    rows.push({
      id,
      profileId: user.id,
      name,
      title,
      initials: initialsFromName(name),
      searchText: `${name} ${title} ${user.user_detail.email ?? ""}`.toLowerCase(),
      availableDays: resolveUserAvailableDays(user),
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
