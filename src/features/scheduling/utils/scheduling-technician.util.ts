import { fetchUserProfile, fetchUsersPage } from "@/features/users/api/user.api";
import type { UserAvailabilityPayloadRow } from "@/features/users/types/user-availability.types";
import type { UserProfile } from "@/features/users/types/user.types";
import {
  resolveUserProfileSelectId,
  userProfileSelectLabel,
} from "@/features/users/utils/load-users-by-role.util";
import { parseUserAvailabilityRows } from "@/features/users/utils/user-availability.util";

export type SchedulingTechnician = {
  id: number;
  profileId: number;
  name: string;
  title: string;
  initials: string;
  searchText: string;
  availableDays: UserAvailabilityPayloadRow[];
};

type UserDetailWithAvailability = UserProfile["user_detail"] & {
  available_days?: unknown;
  availableDays?: unknown;
};

function resolveUserAvailableDays(user: UserProfile): UserAvailabilityPayloadRow[] {
  const detail = user.user_detail as UserDetailWithAvailability | undefined;
  return parseUserAvailabilityRows(
    user.available_days ??
      detail?.available_days ??
      (user as UserProfile & { availableDays?: unknown }).availableDays ??
      detail?.availableDays ??
      null,
  );
}

/** List/dropdown payloads often omit `available_days` — detail has them under `user_detail`. */
async function resolveAvailableDaysWithDetail(
  user: UserProfile,
  profileId: number,
): Promise<UserAvailabilityPayloadRow[]> {
  const fromList = resolveUserAvailableDays(user);
  if (fromList.length > 0) return fromList;
  if (!Number.isFinite(profileId) || profileId <= 0) return [];
  try {
    const detail = await fetchUserProfile(profileId);
    return resolveUserAvailableDays(detail);
  } catch {
    return [];
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        results[index] = await mapper(items[index]!, index);
      }
    }),
  );
  return results;
}

export function technicianMatchesWorkerId(
  tech: Pick<SchedulingTechnician, "id" | "profileId">,
  workerId: number,
): boolean {
  return workerId === tech.id || workerId === tech.profileId;
}

export function technicianWorkerIds(tech: Pick<SchedulingTechnician, "id" | "profileId">): number[] {
  if (tech.profileId > 0 && tech.profileId !== tech.id) return [tech.id, tech.profileId];
  return [tech.id];
}

export function rowsForTechnician<T extends { id: number; worker_id: number; worker_ids?: number[] }>(
  rows: T[],
  tech: Pick<SchedulingTechnician, "id" | "profileId">,
): T[] {
  return rows.filter((row) =>
    (Array.isArray(row.worker_ids) && row.worker_ids.length > 0 ? row.worker_ids : [row.worker_id]).some((id) =>
      technicianMatchesWorkerId(tech, id),
    ),
  );
}

export function workerDayRows<T extends { id: number }>(
  map: Map<string, T[]>,
  tech: Pick<SchedulingTechnician, "id" | "profileId">,
  dayKey: string,
): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const id of technicianWorkerIds(tech)) {
    for (const row of map.get(`${id}:${dayKey}`) ?? []) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
  }
  return out;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

export async function loadSchedulingTechnicians(fallbackTitle: string): Promise<SchedulingTechnician[]> {
  // Full catalog for day/week/month colors + bulk select — walk all dropdown pages.
  const { items } = await fetchUsersPage(1, 20, { dropdown: true, fetchAllPages: true });
  const seen = new Set<number>();
  const draft: Array<{
    id: number;
    profileId: number;
    name: string;
    title: string;
    initials: string;
    searchText: string;
    user: UserProfile;
  }> = [];

  for (const user of items) {
    const id = resolveUserProfileSelectId(user);
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    const name = userProfileSelectLabel(user);
    const title =
      user.role_detail?.role_name?.trim() ||
      user.role_detail?.name?.trim() ||
      fallbackTitle;
    draft.push({
      id,
      profileId: user.id,
      name,
      title,
      initials: initialsFromName(name),
      searchText: `${name} ${title} ${user.user_detail.email ?? ""}`.toLowerCase(),
      user,
    });
  }

  // Detail `GET user-profile/{id}/` carries `user_detail.available_days` for green hours.
  const rows = await mapWithConcurrency(draft, 6, async (row) => {
    const availableDays = await resolveAvailableDaysWithDetail(row.user, row.profileId);
    return {
      id: row.id,
      profileId: row.profileId,
      name: row.name,
      title: row.title,
      initials: row.initials,
      searchText: row.searchText,
      availableDays,
    } satisfies SchedulingTechnician;
  });

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
