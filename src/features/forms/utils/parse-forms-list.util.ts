import type { FormListItem } from "@/features/forms/types/form.types";

function normalizeRow(raw: Record<string, unknown>): FormListItem | null {
  const id = raw.id;
  if (id == null || (typeof id !== "number" && typeof id !== "string")) return null;
  const numId = typeof id === "number" ? id : Number.parseInt(String(id), 10);
  if (!Number.isFinite(numId) || numId <= 0) return null;
  const name =
    (typeof raw.name === "string" && raw.name.trim()) ||
    (typeof raw.form_name === "string" && raw.form_name.trim()) ||
    (typeof raw.title === "string" && raw.title.trim()) ||
    `#${numId}`;
  return { id: numId, name, is_active: typeof raw.is_active === "boolean" ? raw.is_active : undefined };
}

export function parseFormsListResponse(data: unknown): FormListItem[] {
  if (Array.isArray(data)) {
    return data
      .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
      .map(normalizeRow)
      .filter((x): x is FormListItem => x != null);
  }
  if (data && typeof data === "object") {
    const envelope = data as Record<string, unknown>;
    const nested = envelope.data;
    if (Array.isArray(nested)) {
      return nested
        .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
        .map(normalizeRow)
        .filter((x): x is FormListItem => x != null);
    }
    const results = envelope.results;
    if (Array.isArray(results)) {
      return results
        .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
        .map(normalizeRow)
        .filter((x): x is FormListItem => x != null);
    }
  }
  return [];
}
