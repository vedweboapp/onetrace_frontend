import { fetchRoles, fetchUsersPage } from "@/features/users/api/user.api";
import type { UserProfile } from "@/features/users/types/user.types";

export type AppRoleKey = "technician" | "manager" | "sales";

let roleIdMapPromise: Promise<Map<AppRoleKey, number>> | null = null;
/** In-flight / resolved role-scoped lists so job/quotation screens don't re-hit page 1. */
const usersByRoleCache = new Map<AppRoleKey, Promise<UserProfile[]>>();

function matchAppRoleKey(roleName: string): AppRoleKey | null {
  const name = roleName.trim().toLowerCase();
  if (!name) return null;
  if (name.includes("tech")) return "technician";
  if (name.includes("sale")) return "sales";
  if (name.includes("manager")) return "manager";
  return null;
}

/** Resolves role ids once per session (cached). */
export async function resolveAppRoleIdMap(): Promise<Map<AppRoleKey, number>> {
  if (!roleIdMapPromise) {
    roleIdMapPromise = fetchRoles()
      .then((roles) => {
        const map = new Map<AppRoleKey, number>();
        for (const role of roles) {
          const key = matchAppRoleKey(role.role_name ?? role.name ?? "");
          if (key && !map.has(key)) map.set(key, role.id);
        }
        return map;
      })
      .catch((error) => {
        roleIdMapPromise = null;
        throw error;
      });
  }
  return roleIdMapPromise;
}

/**
 * Loads users for one role via `GET user-profile/?role=<id>` (page 1 only).
 * Returns [] when that role does not exist — never falls back to an unfiltered list.
 * Cached per session so quotation/job screens don't repeat the same call.
 */
export async function fetchUsersForAppRole(role: AppRoleKey): Promise<UserProfile[]> {
  const cached = usersByRoleCache.get(role);
  if (cached) return cached;

  const promise = (async () => {
    const roleIds = await resolveAppRoleIdMap();
    const roleId = roleIds.get(role);
    if (roleId == null) return [];
    const { items } = await fetchUsersPage(1, 20, { role: roleId, dropdown: true });
    return items;
  })().catch((error) => {
    usersByRoleCache.delete(role);
    throw error;
  });

  usersByRoleCache.set(role, promise);
  return promise;
}

/** Parallel role-scoped loads; only requested roles that exist are fetched. */
export async function fetchUsersForAppRoles(
  roles: readonly AppRoleKey[],
): Promise<Partial<Record<AppRoleKey, UserProfile[]>>> {
  const unique = [...new Set(roles)];
  const entries = await Promise.all(
    unique.map(async (role) => [role, await fetchUsersForAppRole(role)] as const),
  );
  return Object.fromEntries(entries) as Partial<Record<AppRoleKey, UserProfile[]>>;
}

export function resolveUserProfileSelectId(user: UserProfile): number {
  const detailId = user.user_detail?.id;
  if (typeof detailId === "number" && Number.isFinite(detailId) && detailId > 0) return detailId;
  return user.id;
}

export function userProfileSelectLabel(user: UserProfile): string {
  const id = resolveUserProfileSelectId(user);
  const fullName = `${user.user_detail.first_name ?? ""} ${user.user_detail.last_name ?? ""}`.trim();
  return fullName || user.user_detail.email?.trim() || `#${id}`;
}

export function userProfilesToSelectOptions(
  users: UserProfile[],
): Array<{ value: string; label: string }> {
  return users.map((user) => {
    const id = resolveUserProfileSelectId(user);
    return {
      value: String(id),
      label: userProfileSelectLabel(user),
    };
  });
}
