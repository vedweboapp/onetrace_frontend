import api from "@/core/api/axios";
import { PersonalProfilePaths } from "./personal-profile.path";
import { ApiEnvelope, assertApiSuccess } from "@/core/types/api.types";

export async function fetchPersonalProfile(id: string) {
    const { data } = await api.get(PersonalProfilePaths.fetchProfile(id));
    // assertApiSuccess(data);
    return data;
}

export async function updatePersonalProfile(id: string, body: any) {
    const { data } = await api.patch<ApiEnvelope<any>>(PersonalProfilePaths.updateProfile(id), body);
    assertApiSuccess(data);
    return data.data;
}
