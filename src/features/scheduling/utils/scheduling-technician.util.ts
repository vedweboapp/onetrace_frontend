import { fetchUsersPage } from "@/features/users/api/user.api";
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
  const { items } = await fetchUsersPage(1, 500);
  const seen = new Set<number>();
  const rows: SchedulingTechnician[] = [];
  for (const user of items) {
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
