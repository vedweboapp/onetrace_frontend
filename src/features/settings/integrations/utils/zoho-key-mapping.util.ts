import type {
  ZohoKeyMappingData,
  ZohoMappingRow,
  ZohoSaveKeyMappingPayload,
  ZohoSaveKeyMappingResponse,
  ZohoWebhookSetupData,
  ZohoFieldSchema,
  ZohoExistingMapping,
} from "../types/integration.types";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";

export function nextZohoMappingRowId(): string {
  return `zoho-map-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function existingMappingToRows(
  existing: ZohoExistingMapping[] | Record<string, string>[] | undefined,
): ZohoMappingRow[] {
  const rows: ZohoMappingRow[] = [];
  for (const map of existing ?? []) {
    if (typeof map === "object" && map !== null) {
      if ("internal_field" in map || "inetrnal_field" in map || "external_field" in map) {
        const item = map as ZohoExistingMapping;
        const internal = (item.internal_field || item.inetrnal_field || "").trim();
        const external = (item.external_field || "").trim();
        if (internal && external) {
          rows.push({
            id: nextZohoMappingRowId(),
            externalField: external,
            internalField: internal,
          });
        }
      } else {
        // Fallback for legacy key-value format
        for (const [externalField, internalField] of Object.entries(map)) {
          const external = String(externalField).trim();
          const internal = String(internalField).trim();
          if (!external || !internal) continue;
          rows.push({
            id: nextZohoMappingRowId(),
            externalField: external,
            internalField: internal,
          });
        }
      }
    }
  }
  return rows.length > 0
    ? rows
    : [{ id: nextZohoMappingRowId(), externalField: "", internalField: "" }];
}

export function rowsToMappings(
  rows: ZohoMappingRow[],
  internalOptions: CheckmarkSelectOption[],
  externalOptions: CheckmarkSelectOption[],
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

    const internalOpt = internalOptions.find((o) => o.value === internal_field);
    const externalOpt = externalOptions.find((o) => o.value === external_field);

    const internal_field_label = (internalOpt?.label || "").trim() || null;
    const external_field_label = (externalOpt?.label || "").trim() || null;

    mappings.push({
      internal_field,
      inetrnal_field: internal_field,
      internal_field_label,
      external_field,
      external_field_label,
    });
  }
  return mappings;
}

export function toSelectOptions(fields: ZohoFieldSchema[]): CheckmarkSelectOption[] {
  return fields.map((f) => ({
    value: f.field,
    label: f.label || f.field,
  }));
}

export function sortInternalFields(fields: ZohoFieldSchema[]): ZohoFieldSchema[] {
  return [...fields].sort((a, b) => {
    const aReq = !!a.required;
    const bReq = !!b.required;
    if (aReq && !bReq) return -1;
    if (!aReq && bReq) return 1;
    return 0;
  });
}

export type { ZohoKeyMappingData, ZohoSaveKeyMappingResponse, ZohoWebhookSetupData };
