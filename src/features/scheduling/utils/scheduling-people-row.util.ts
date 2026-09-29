import type { UserGroup } from "@/features/user-groups/types/user-group.types";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import { technicianMatchesWorkerId } from "@/features/scheduling/utils/scheduling-technician.util";

export type SchedulingPeopleListMode = "users" | "groups";

export type SchedulingGroupRow = {
  id: number;
  name: string;
  initials: string;
  memberCount: number;
  members: SchedulingTechnician[];
  searchText: string;
};

function groupInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "G";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function resolveGroupMembers(
  group: UserGroup,
  technicians: SchedulingTechnician[],
): SchedulingTechnician[] {
  const memberIds = (group.users ?? []).map((u) => u.id).filter((id) => Number.isFinite(id) && id > 0);
  if (memberIds.length === 0) return [];
  return technicians.filter((tech) => memberIds.some((id) => technicianMatchesWorkerId(tech, id)));
}

export function buildSchedulingGroupRows(
  groups: UserGroup[],
  technicians: SchedulingTechnician[],
  search = "",
): SchedulingGroupRow[] {
  const q = search.trim().toLowerCase();
  const rows: SchedulingGroupRow[] = [];
  for (const group of groups) {
    if (!group || typeof group.id !== "number" || group.id <= 0) continue;
    const name = group.name?.trim() || `Group #${group.id}`;
    const searchText = name.toLowerCase();
    if (q && !searchText.includes(q)) continue;
    const members = resolveGroupMembers(group, technicians);
    rows.push({
      id: group.id,
      name,
      initials: groupInitials(name),
      memberCount: members.length,
      members,
      searchText,
    });
  }
  return rows;
}
