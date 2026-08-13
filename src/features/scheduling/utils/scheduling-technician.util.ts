import {
  fetchUsersForAppRole,
  resolveUserProfileSelectId,
  userProfileSelectLabel,
} from "@/features/users/utils/load-users-by-role.util";

export type SchedulingTechnician = {
  id: number;
  name: string;
  title: string;
  initials: string;
  searchText: string;
};

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

export async function loadSchedulingTechnicians(fallbackTitle: string): Promise<SchedulingTechnician[]> {
  const users = await fetchUsersForAppRole("technician");
  return users.map((user) => {
    const id = resolveUserProfileSelectId(user);
    const name = userProfileSelectLabel(user);
    const title =
      user.role_detail?.role_name?.trim() ||
      user.role_detail?.name?.trim() ||
      fallbackTitle;
    return {
      id,
      name,
      title,
      initials: initialsFromName(name),
      searchText: `${name} ${title}`.toLowerCase(),
    };
  });
}
