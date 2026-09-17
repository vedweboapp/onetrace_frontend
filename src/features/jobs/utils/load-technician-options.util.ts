import {
  fetchUsersForAppRole,
  userProfilesToSelectOptions,
} from "@/features/users/utils/load-users-by-role.util";

export type SelectOption = { value: string; label: string };

/** Technicians only: `GET user-profile/?role=<technicianRoleId>`. */
export async function loadTechnicianOptions(): Promise<SelectOption[]> {
  const users = await fetchUsersForAppRole("technician");
  return userProfilesToSelectOptions(users);
}
