import type { Group } from "@/features/groups/types/group.types";

/** Resolve parent FK from API detail payloads (id or nested object). */
export function resolveParentGroupId(parent: Group["parent"]): string {
  if (typeof parent === "number" && Number.isFinite(parent) && parent > 0) return String(parent);
  if (parent && typeof parent === "object" && typeof parent.id === "number" && parent.id > 0) {
    return String(parent.id);
  }
  return "";
}

type GroupParentCreateFields = {
  parent?: number;
};

type GroupParentUpdateFields = {
  parent?: number | null;
};

/**
 * Parent field → payload:
 * - parent selected → `parent: <id>`
 * - no parent on create → omit `parent`
 * - no parent on update → `parent: null`
 */
export function buildGroupParentPayload(
  parentValue: string,
  mode: "create",
): GroupParentCreateFields;
export function buildGroupParentPayload(
  parentValue: string,
  mode: "update",
): GroupParentUpdateFields;
export function buildGroupParentPayload(
  parentValue: string,
  mode: "create" | "update",
): GroupParentCreateFields | GroupParentUpdateFields {
  const parentId = Number(parentValue);
  const hasParent = Number.isFinite(parentId) && parentId > 0;
  if (hasParent) {
    return { parent: parentId };
  }
  if (mode === "update") {
    return { parent: null };
  }
  return {};
}

/** Prefer top-level groups (no parent) in the parent picker. */
export function isSelectableParentGroup(group: Group, excludeId?: number): boolean {
  if (excludeId != null && group.id === excludeId) return false;
  return !resolveParentGroupId(group.parent);
}
