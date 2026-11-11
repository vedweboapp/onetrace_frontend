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
  is_parent: boolean;
};

type GroupParentUpdateFields = {
  parent?: number | null;
  is_parent: boolean;
};

/**
 * Parent field → payload:
 * - parent selected → `parent: <id>` + `is_parent: true`
 * - no parent → `is_parent: true` (top-level parent group); clear `parent` on update
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
    return { parent: parentId, is_parent: true };
  }
  if (mode === "update") {
    return { parent: null, is_parent: true };
  }
  return { is_parent: true };
}

/** Prefer true parent groups in the parent picker. */
export function isSelectableParentGroup(group: Group, excludeId?: number): boolean {
  if (excludeId != null && group.id === excludeId) return false;
  if (group.is_parent === true) return true;
  if (group.is_parent === false) return false;
  return !resolveParentGroupId(group.parent);
}
