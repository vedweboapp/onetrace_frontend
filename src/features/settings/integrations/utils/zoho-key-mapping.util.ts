import type {
  ZohoKeyMappingData,
  ZohoMappingRow,
  ZohoSaveKeyMappingPayload,
  ZohoSaveKeyMappingResponse,
  ZohoWebhookSetupData,
} from "../types/integration.types";

export function nextZohoMappingRowId(): string {
  return `zoho-map-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function existingMappingToRows(existing: Record<string, string>[] | undefined): ZohoMappingRow[] {
  const rows: ZohoMappingRow[] = [];
  for (const map of existing ?? []) {
    for (const [externalField, internalField] of Object.entries(map)) {
      const external = externalField.trim();
      const internal = internalField.trim();
      if (!external || !internal) continue;
      rows.push({
        id: nextZohoMappingRowId(),
        externalField: external,
        internalField: internal,
      });
    }
  }
  return rows.length > 0
    ? rows
    : [{ id: nextZohoMappingRowId(), externalField: "", internalField: "" }];
}

export function rowsToMappings(rows: ZohoMappingRow[]): ZohoSaveKeyMappingPayload["mappings"] {
  const seen = new Set<string>();
  const mappings: ZohoSaveKeyMappingPayload["mappings"] = [];
  for (const row of rows) {
    const external_field = row.externalField.trim();
    const internal_field = row.internalField.trim();
    if (!external_field || !internal_field) continue;
    const key = `${external_field}::${internal_field}`;
    if (seen.has(key)) continue;
    seen.add(key);
    mappings.push({ external_field, internal_field });
  }
  return mappings;
}

export function toSelectOptions(values: string[]) {
  return values.map((value) => ({ value, label: value }));
}

export type { ZohoKeyMappingData, ZohoSaveKeyMappingResponse, ZohoWebhookSetupData };
