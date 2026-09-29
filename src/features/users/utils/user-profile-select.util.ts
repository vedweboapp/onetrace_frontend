import { fetchProfilesList } from "@/features/settings/profiles/api/profile.api";
import type { Profile } from "@/features/settings/profiles/types/profile.types";
import type { UserProfile, UserProfileDetailRef } from "@/features/users/types/user.types";

export function profileSelectLabel(profile: Pick<Profile, "id" | "profile_name">): string {
  const name = profile.profile_name?.trim();
  return name || `Profile #${profile.id}`;
}

export function profilesToSelectOptions(
  profiles: Profile[],
): Array<{ value: string; label: string }> {
  return profiles
    .filter((p) => p.is_active !== false)
    .map((p) => ({
      value: String(p.id),
      label: profileSelectLabel(p),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Loads active profiles for user invite/edit/detail selects. */
export async function loadUserProfileSelectOptions(): Promise<
  Array<{ value: string; label: string }>
> {
  const rows = await fetchProfilesList();
  return profilesToSelectOptions(rows);
}

export function resolveUserProfileDetail(row: UserProfile): UserProfileDetailRef | null {
  if (row.profile_detail && typeof row.profile_detail.id === "number" && row.profile_detail.id > 0) {
    return row.profile_detail;
  }
  if (typeof row.profile === "number" && row.profile > 0) {
    return { id: row.profile, profile_name: null };
  }
  return null;
}

export function userProfileLabel(row: UserProfile | null | undefined): string {
  const detail = row ? resolveUserProfileDetail(row) : null;
  if (!detail) return "—";
  return (
    detail.profile_name?.trim() ||
    detail.name?.trim() ||
    (detail.id > 0 ? `Profile #${detail.id}` : "—")
  );
}

export function userProfileSelectId(row: UserProfile | null | undefined): string {
  const detail = row ? resolveUserProfileDetail(row) : null;
  return detail?.id && detail.id > 0 ? String(detail.id) : "";
}
