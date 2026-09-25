import { z } from "zod";
import type { Profile, ProfilePayload } from "../types/profile.types";

export type ProfileFormSchemaMessages = {
  profileNameRequired?: string;
  roleRequired?: string;
};

export function createProfileFormSchema(msg?: ProfileFormSchemaMessages) {
  return z.object({
    profile_name: z.string().trim().min(1, msg?.profileNameRequired ?? "Profile name is required"),
    profile_type: z.string(),
    description: z.string(),
    role: z
      .string()
      .trim()
      .regex(/^\d+$/, msg?.roleRequired ?? "Select a role."),
  });
}

export type ProfileFormValues = {
  profile_name: string;
  profile_type: string;
  description: string;
  role: string;
};

export function emptyProfileFormDefaults(): ProfileFormValues {
  return {
    profile_name: "",
    profile_type: "",
    description: "",
    role: "",
  };
}

export function profileToFormDefaults(profile: Partial<Profile>): ProfileFormValues {
  const roleId =
    typeof profile.role === "number"
      ? profile.role
      : profile.role && typeof profile.role === "object" && typeof profile.role.id === "number"
        ? profile.role.id
        : null;
  return {
    profile_name: profile.profile_name ?? "",
    profile_type: profile.profile_type ?? "",
    description: profile.description ?? "",
    role: roleId != null && roleId > 0 ? String(roleId) : "",
  };
}

export function mapProfileFormToPayload(values: ProfileFormValues): ProfilePayload {
  const role = Number.parseInt(values.role, 10);
  return {
    profile_name: values.profile_name.trim(),
    profile_type: values.profile_type.trim() || null,
    description: values.description.trim() || null,
    role: Number.isFinite(role) && role > 0 ? role : null,
  };
}

/** Merge a single-field change into a full PUT payload from the loaded record. */
export function mergeProfileDetailPayload(profile: Profile, patch: Partial<ProfilePayload>): ProfilePayload {
  return { ...mapProfileFormToPayload(profileToFormDefaults(profile)), ...patch };
}
