import api from "@/core/api/axios";
import { ApiEnvelope, assertApiSuccess } from "@/core/types/api.types";
import type { Profile, ProfilePayload } from "../types/profile.types";

export async function fetchProfilesList(): Promise<Profile[]> {
  const { data } = await api.get<ApiEnvelope<Profile[]> | { success: boolean; data: Profile[] } | Profile[]>("profile/");
  if (Array.isArray(data)) return data;
  if ("data" in data && Array.isArray(data.data)) return data.data;
  return [];
}

export async function fetchProfileDetail(id: number): Promise<Profile> {
  const { data } = await api.get<ApiEnvelope<Profile> | Profile>(`profile/${id}/`);
  if (data && typeof data === "object" && "id" in data && typeof (data as Profile).id === "number" && !("success" in data)) {
    return data as Profile;
  }
  assertApiSuccess(data as ApiEnvelope<Profile>);
  return (data as ApiEnvelope<Profile>).data;
}

export async function createProfile(payload: ProfilePayload): Promise<Profile> {
  const { data } = await api.post<ApiEnvelope<Profile> | Profile>("profile/", payload);
  if (data && typeof data === "object" && "id" in data && typeof (data as Profile).id === "number" && !("success" in data)) {
    return data as Profile;
  }
  assertApiSuccess(data as ApiEnvelope<Profile>);
  return (data as ApiEnvelope<Profile>).data;
}

export async function updateProfile(id: number, payload: ProfilePayload): Promise<Profile> {
  const { data } = await api.put<ApiEnvelope<Profile> | Profile>(`profile/${id}/`, payload);
  if (data && typeof data === "object" && "id" in data && typeof (data as Profile).id === "number" && !("success" in data)) {
    return data as Profile;
  }
  assertApiSuccess(data as ApiEnvelope<Profile>);
  return (data as ApiEnvelope<Profile>).data;
}

export async function deleteProfile(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<void>>(`profile/${id}/`);
  assertApiSuccess(data);
}
