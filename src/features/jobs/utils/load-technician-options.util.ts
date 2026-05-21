import { fetchRoles, fetchUsersPage } from "@/features/users/api/user.api";
import { userProfileLabel } from "@/features/jobs/utils/job-nested-fields.util";

export type SelectOption = { value: string; label: string };

export async function loadTechnicianOptions(): Promise<SelectOption[]> {
  const [roles, allUsers] = await Promise.all([fetchRoles(), fetchUsersPage(1, 500)]);
  const technicianRoleId = roles.find((r) => {
    const name = (r.role_name ?? r.name ?? "").toLowerCase();
    return name.includes("tech");
  })?.id;

  const { items } = technicianRoleId
    ? await fetchUsersPage(1, 500, { role: technicianRoleId })
    : allUsers;

  return items.map((u) => ({
    value: String(u.user_detail.id),
    label: userProfileLabel(u),
  }));
}
