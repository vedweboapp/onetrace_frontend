import api from "@/core/api/axios";
import { ApiEnvelope, assertApiSuccess } from "@/core/types/api.types";
import type { Role, RolePayload } from "../types/role.types";

export async function fetchRolesList(): Promise<Role[]> {
  const { data } = await api.get<ApiEnvelope<Role[]> | { success: boolean; data: Role[] } | Role[]>("role/");
  if (Array.isArray(data)) return data;
  if ("data" in data && Array.isArray(data.data)) return data.data;
  return [];
}

export async function fetchRoleDetail(id: number): Promise<Role> {
  const { data } = await api.get<ApiEnvelope<Role> | Role>(`role/${id}/`);
  if (data && typeof data === "object" && "id" in data && typeof (data as Role).id === "number" && !("success" in data)) {
    return data as Role;
  }
  assertApiSuccess(data as ApiEnvelope<Role>);
  return (data as ApiEnvelope<Role>).data;
}

export async function createRole(payload: RolePayload): Promise<Role> {
  const { data } = await api.post<ApiEnvelope<Role> | Role>("role/", payload);
  if (data && typeof data === "object" && "id" in data && typeof (data as Role).id === "number" && !("success" in data)) {
    return data as Role;
  }
  assertApiSuccess(data as ApiEnvelope<Role>);
  return (data as ApiEnvelope<Role>).data;
}

export async function updateRole(id: number, payload: RolePayload): Promise<Role> {
  const { data } = await api.put<ApiEnvelope<Role> | Role>(`role/${id}/`, payload);
  if (data && typeof data === "object" && "id" in data && typeof (data as Role).id === "number" && !("success" in data)) {
    return data as Role;
  }
  assertApiSuccess(data as ApiEnvelope<Role>);
  return (data as ApiEnvelope<Role>).data;
}

export async function deleteRole(id: number): Promise<void> {
  const { data } = await api.delete<ApiEnvelope<void>>(`role/${id}/`);
  assertApiSuccess(data);
}
