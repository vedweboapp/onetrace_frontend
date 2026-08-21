import { z } from "zod";
import type { Profile, ProfilePayload } from "../types/profile.types";

export type ProfileFormSchemaMessages = {
  profileNameRequired?: string;
};

export function createProfileFormSchema(msg?: ProfileFormSchemaMessages) {
  return z.object({
    profile_name: z.string().trim().min(1, msg?.profileNameRequired ?? "Profile name is required"),
    profile_type: z.string(),
    description: z.string(),
  });
}

export type ProfileFormValues = {
  profile_name: string;
  profile_type: string;
  description: string;
};

export function emptyProfileFormDefaults(): ProfileFormValues {
  return {
    profile_name: "",
    profile_type: "",
    description: "",
  };
}

export function profileToFormDefaults(profile: Partial<Profile>): ProfileFormValues {
  return {
    profile_name: profile.profile_name ?? "",
    profile_type: profile.profile_type ?? "",
    description: profile.description ?? "",
  };
}

export function mapProfileFormToPayload(values: ProfileFormValues): ProfilePayload {
  return {
    profile_name: values.profile_name.trim(),
    profile_type: values.profile_type.trim() || null,
    description: values.description.trim() || null,
  };
}

/** Merge a single-field change into a full PUT payload from the loaded record. */
export function mergeProfileDetailPayload(profile: Profile, patch: Partial<ProfilePayload>): ProfilePayload {
  return { ...mapProfileFormToPayload(profileToFormDefaults(profile)), ...patch };
}
