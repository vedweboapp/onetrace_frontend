import type {
  ZohoExistingMapping,
  ZohoFieldDef,
  ZohoFieldGroup,
  ZohoKeyMappingData,
  ZohoMappingRow,
  ZohoSaveKeyMappingPayload,
  ZohoSaveKeyMappingResponse,
  ZohoWebhookSetupData,
} from "../types/integration.types";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";

export function nextZohoMappingRowId(): string {
  return `zoho-map-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isFieldDef(value: unknown): value is ZohoFieldDef {
  return (
    !!value &&
    typeof value === "object" &&
    "field" in value &&
    typeof (value as ZohoFieldDef).field === "string" &&
    !Array.isArray((value as { fields?: unknown }).fields) &&
    !Array.isArray((value as { type?: unknown }).type)
  );
}

function readGroupFieldList(group: Record<string, unknown>): unknown[] {
  // API may send fields under `fields` or mistakenly under `type`.
  if (Array.isArray(group.fields)) return group.fields;
  if (Array.isArray(group.type)) return group.type;
  return [];
}

function isFieldGroupLike(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (typeof row.group !== "string" && typeof row.label !== "string") return false;
  return Array.isArray(row.fields) || Array.isArray(row.type) || "group" in row;
}

function normalizeFieldDefs(rawFields: unknown[]): ZohoFieldDef[] {
  const seen = new Set<string>();
  const out: ZohoFieldDef[] = [];
  for (const item of rawFields) {
    if (!isFieldDef(item)) continue;
    const key = item.field.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      field: key,
      label: item.label || key,
      type: typeof item.type === "string" && item.type.trim() ? item.type : "string",
      required: !!item.required,
    });
  }
  return out;
}

/** Normalize API catalogs: grouped (preferred) or legacy flat field arrays. */
export function normalizeFieldGroups(raw: unknown): ZohoFieldGroup[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  if (raw.every(isFieldGroupLike)) {
    return raw.map((group) => {
      const row = group as Record<string, unknown>;
      const groupKey = String(row.group ?? "").trim() || "general";
      return {
        group: groupKey,
        label: String(row.label ?? groupKey).trim() || "General",
        internal_model:
          typeof row.internal_model === "string" || row.internal_model == null
            ? ((row.internal_model as string | null | undefined) ?? null)
            : null,
        fields: normalizeFieldDefs(readGroupFieldList(row)),
      };
    });
  }

  if (raw.every(isFieldDef)) {
    return [
      {
        group: "general",
        label: "General",
        fields: normalizeFieldDefs(raw),
      },
    ];
  }

  // Mixed / partial payloads — best-effort group extraction.
  const groups: ZohoFieldGroup[] = [];
  for (const item of raw) {
    if (isFieldGroupLike(item)) {
      const row = item as Record<string, unknown>;
      const groupKey = String(row.group ?? "").trim() || "general";
      groups.push({
        group: groupKey,
        label: String(row.label ?? groupKey).trim() || "General",
        internal_model:
          typeof row.internal_model === "string" || row.internal_model == null
            ? ((row.internal_model as string | null | undefined) ?? null)
            : null,
        fields: normalizeFieldDefs(readGroupFieldList(row)),
      });
    }
  }
  return groups;
}

export function sortGroups(groups: ZohoFieldGroup[]): ZohoFieldGroup[] {
  return [...groups].sort((a, b) => {
    const aGeneral = a.group.trim().toLowerCase() === "general" ? 0 : 1;
    const bGeneral = b.group.trim().toLowerCase() === "general" ? 0 : 1;
    if (aGeneral !== bGeneral) return aGeneral - bGeneral;
    return a.label.localeCompare(b.label);
  });
}

export function sortFieldsInGroup(fields: ZohoFieldDef[]): ZohoFieldDef[] {
  return [...fields].sort((a, b) => {
    const aReq = !!a.required;
    const bReq = !!b.required;
    if (aReq && !bReq) return -1;
    if (!aReq && bReq) return 1;
    return (a.label || a.field).localeCompare(b.label || b.field);
  });
}

export function findFieldInGroups(
  groups: ZohoFieldGroup[],
  field: string,
  group?: string | null,
): { group: ZohoFieldGroup; field: ZohoFieldDef } | null {
  const needle = field.trim();
  if (!needle) return null;
  const preferredGroup = group?.trim().toLowerCase();
  if (preferredGroup) {
    const match = groups.find((g) => g.group.trim().toLowerCase() === preferredGroup);
    const fieldDef = match?.fields.find((f) => f.field === needle);
    if (match && fieldDef) return { group: match, field: fieldDef };
  }
  for (const g of groups) {
    const fieldDef = g.fields.find((f) => f.field === needle);
    if (fieldDef) return { group: g, field: fieldDef };
  }
  return null;
}

/**
 * Build mapping rows:
 * - Seed required SimHo fields for every group (Zoho side empty)
 * - Overlay existing mappings
 * - Ensure at least an empty addable state is represented per group via UI (not empty rows)
 */
export function buildGroupedMappingRows(
  internalGroups: ZohoFieldGroup[],
  existing: ZohoExistingMapping[] | undefined,
): ZohoMappingRow[] {
  const rows: ZohoMappingRow[] = [];
  const usedInternal = new Set<string>();

  for (const map of existing ?? []) {
    const internal = (map.internal_field || map.inetrnal_field || "").trim();
    const external = (map.external_field || "").trim();
    if (!internal) continue;
    const internalGroup =
      map.internal_group?.trim() ||
      findFieldInGroups(internalGroups, internal)?.group.group ||
      "general";
    const key = `${internalGroup}::${internal}`;
    if (usedInternal.has(key)) continue;
    usedInternal.add(key);
    rows.push({
      id: nextZohoMappingRowId(),
      internalGroup,
      internalField: internal,
      externalGroup: map.external_group?.trim() || "",
      externalField: external,
      required: !!map.is_required,
    });
  }

  for (const group of internalGroups) {
    const isGeneral = group.group.trim().toLowerCase() === "general";
    if (!isGeneral) continue;
    for (const field of sortFieldsInGroup(group.fields)) {
      if (!field.required) continue;
      const key = `${group.group}::${field.field}`;
      if (usedInternal.has(key)) {
        const existingRow = rows.find(
          (r) => r.internalGroup === group.group && r.internalField === field.field,
        );
        if (existingRow) existingRow.required = true;
        continue;
      }
      usedInternal.add(key);
      rows.push({
        id: nextZohoMappingRowId(),
        internalGroup: group.group,
        internalField: field.field,
        externalGroup: "",
        externalField: "",
        required: true,
      });
    }
  }

  return rows;
}

export function rowsToMappings(
  rows: ZohoMappingRow[],
  internalGroups: ZohoFieldGroup[],
  externalGroups: ZohoFieldGroup[],
): ZohoSaveKeyMappingPayload["mappings"] {
  const seen = new Set<string>();
  const mappings: ZohoSaveKeyMappingPayload["mappings"] = [];

  for (const row of rows) {
    const external_field = row.externalField.trim();
    const internal_field = row.internalField.trim();
    if (!external_field || !internal_field) continue;
    const key = `${external_field}::${internal_field}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const internalMatch = findFieldInGroups(internalGroups, internal_field, row.internalGroup);
    const externalMatch = findFieldInGroups(externalGroups, external_field, row.externalGroup);

    mappings.push({
      internal_field,
      inetrnal_field: internal_field,
      internal_field_label: internalMatch?.field.label ?? null,
      internal_group: internalMatch?.group.group ?? (row.internalGroup || null),
      external_field,
      external_field_label: externalMatch?.field.label ?? null,
      external_group: externalMatch?.group.group ?? (row.externalGroup || null),
    });
  }
  return mappings;
}

export function groupFieldsToSelectOptions(
  groups: ZohoFieldGroup[],
  groupKey?: string,
): CheckmarkSelectOption[] {
  const scoped = groupKey
    ? groups.filter((g) => g.group === groupKey)
    : groups;
  return scoped.flatMap((g) =>
    sortFieldsInGroup(g.fields).map((f) => ({
      value: f.field,
      label: f.label || f.field,
    })),
  );
}

export function allExternalSelectOptions(groups: ZohoFieldGroup[]): CheckmarkSelectOption[] {
  return groups.flatMap((g) =>
    sortFieldsInGroup(g.fields).map((f) => ({
      value: `${g.group}::${f.field}`,
      label: groups.length > 1 ? `${g.label} · ${f.label || f.field}` : f.label || f.field,
    })),
  );
}

export function parseExternalOptionValue(value: string): { group: string; field: string } {
  const idx = value.indexOf("::");
  if (idx < 0) return { group: "", field: value };
  return { group: value.slice(0, idx), field: value.slice(idx + 2) };
}

export function externalOptionValue(group: string, field: string): string {
  if (!field) return "";
  return group ? `${group}::${field}` : field;
}

/** @deprecated Prefer groupFieldsToSelectOptions */
export function toSelectOptions(fields: ZohoFieldDef[]): CheckmarkSelectOption[] {
  return fields.map((f) => ({
    value: f.field,
    label: f.label || f.field,
  }));
}

/** @deprecated Prefer sortFieldsInGroup */
export function sortInternalFields(fields: ZohoFieldDef[]): ZohoFieldDef[] {
  return sortFieldsInGroup(fields);
}

/** @deprecated Prefer buildGroupedMappingRows */
export function existingMappingToRows(
  existing: ZohoExistingMapping[] | Record<string, string>[] | undefined,
): ZohoMappingRow[] {
  return buildGroupedMappingRows([], (existing as ZohoExistingMapping[]) ?? []);
}

export type { ZohoKeyMappingData, ZohoSaveKeyMappingResponse, ZohoWebhookSetupData };
