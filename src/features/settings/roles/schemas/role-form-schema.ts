import { z } from "zod";
import type { Role, RolePayload } from "../types/role.types";

export type RoleFormSchemaMessages = {
  roleNameRequired?: string;
};

export function createRoleFormSchema(msg?: RoleFormSchemaMessages) {
  return z.object({
    role_name: z.string().trim().min(1, msg?.roleNameRequired ?? "Role name is required"),
    parent_role: z.string(),
    description: z.string(),
    shared_data_with_peers: z.boolean(),
  });
}

export type RoleFormValues = {
  role_name: string;
  parent_role: string;
  description: string;
  shared_data_with_peers: boolean;
};

export function emptyRoleFormDefaults(): RoleFormValues {
  return {
    role_name: "",
    parent_role: "",
    description: "",
    shared_data_with_peers: false,
  };
}

export function roleToFormDefaults(role: Partial<Role>): RoleFormValues {
  return {
    role_name: role.role_name ?? role.name ?? "",
    parent_role: role.parent_role != null ? String(role.parent_role) : "",
    description: role.description ?? "",
    shared_data_with_peers: Boolean(role.shared_data_with_peers),
  };
}

export function mapRoleFormToPayload(values: RoleFormValues): RolePayload {
  const parentId = values.parent_role.trim() ? Number(values.parent_role) : null;
  return {
    role_name: values.role_name.trim(),
    parent_role: Number.isFinite(parentId) ? parentId : null,
    description: values.description.trim() || null,
    shared_data_with_peers: values.shared_data_with_peers,
  };
}

/** Merge a single-field change into a full PUT payload from the loaded record. */
export function mergeRoleDetailPayload(role: Role, patch: Partial<RolePayload>): RolePayload {
  return { ...mapRoleFormToPayload(roleToFormDefaults(role)), ...patch };
}
