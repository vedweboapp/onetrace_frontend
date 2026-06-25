export type ZohoWebhookPayloadField = {
  field: string;
  sampleValue: string;
  required: boolean;
};

export type ParsedZohoWebhookSamplePayload = {
  /** Top-level key, e.g. `items`. */
  rootKey: string;
  fields: ZohoWebhookPayloadField[];
  /** Same shape as API sample — array entries without `required`. */
  copyPayload: Record<string, unknown>;
};

function isFieldSpecEntry(entry: unknown): entry is Record<string, unknown> {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
  const keys = Object.keys(entry).filter((k) => k !== "required");
  return keys.length === 1;
}

function parseFieldSpecArray(entries: unknown[]): ZohoWebhookPayloadField[] {
  const fields: ZohoWebhookPayloadField[] = [];
  for (const entry of entries) {
    if (!isFieldSpecEntry(entry)) continue;
    const keys = Object.keys(entry).filter((k) => k !== "required");
    const field = keys[0]!;
    const rawValue = entry[field];
    fields.push({
      field,
      sampleValue:
        typeof rawValue === "string"
          ? rawValue
          : rawValue == null
            ? ""
            : typeof rawValue === "object"
              ? JSON.stringify(rawValue)
              : String(rawValue),
      required: entry.required === true,
    });
  }
  return fields;
}

function buildItemsArrayPayload(
  arrayKey: string,
  fields: ZohoWebhookPayloadField[],
): ParsedZohoWebhookSamplePayload {
  const itemObject: Record<string, string> = {};
  for (const row of fields) {
    itemObject[row.field] = row.sampleValue;
  }

  return {
    rootKey: arrayKey,
    fields,
    copyPayload: {
      [arrayKey]: [itemObject],
    },
  };
}

function parseNestedObjectPayload(
  rootKey: string,
  nested: Record<string, unknown>,
): ParsedZohoWebhookSamplePayload {
  const fields: ZohoWebhookPayloadField[] = [];

  for (const [field, rawValue] of Object.entries(nested)) {
    if (field === "required") continue;
    const sampleValue =
      typeof rawValue === "string"
        ? rawValue
        : rawValue == null
          ? ""
          : typeof rawValue === "object"
            ? JSON.stringify(rawValue)
            : String(rawValue);
    fields.push({ field, sampleValue, required: false });
  }

  return buildItemsArrayPayload(rootKey, fields);
}

/**
 * Parses API `sample_payload` metadata into a copyable body and required-field hints.
 * Preserves a single object per array entry — all fields together, without `required` flags.
 */
export function parseZohoWebhookSamplePayload(
  raw: Record<string, unknown> | null | undefined,
  module?: string,
): ParsedZohoWebhookSamplePayload {
  const payload = raw ?? {};

  for (const [key, value] of Object.entries(payload)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    if (!value.every(isFieldSpecEntry)) continue;

    const fields = parseFieldSpecArray(value);
    const arrayKey = key.trim() || module?.trim() || "items";
    return buildItemsArrayPayload(arrayKey, fields);
  }

  for (const [key, value] of Object.entries(payload)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const arrayKey = module?.trim() || key;
    return parseNestedObjectPayload(arrayKey, value as Record<string, unknown>);
  }

  const fallbackKey = module?.trim() || "items";
  return buildItemsArrayPayload(fallbackKey, []);
}
