import type { UserGroup, UserGroupUserRef } from "@/features/user-groups/types/user-group.types";

export function formatUserGroupLabel(row: Pick<UserGroup, "id" | "name">): string {
  const name = row.name?.trim();
  return name || `Group #${row.id}`;
}

export function formatUserGroupMemberLabel(user: UserGroupUserRef): string {
  const first = user.first_name?.trim() ?? "";
  const last = user.last_name?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  if (full) return full;
  const username = user.username?.trim();
  if (username) return username;
  const email = user.email?.trim();
  if (email) return email;
  return `User #${user.id}`;
}

export function userGroupMemberIds(row: Pick<UserGroup, "users">): number[] {
  return (row.users ?? []).map((u) => u.id).filter((id) => Number.isFinite(id) && id > 0);
}
