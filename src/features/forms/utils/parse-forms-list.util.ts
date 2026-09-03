import type { FormListItem, FormsPagination } from "@/features/forms/types/form.types";

function normalizeRow(raw: Record<string, unknown>): FormListItem | null {
  const id = raw.id ?? raw.form_id;
  if (id == null || (typeof id !== "number" && typeof id !== "string")) return null;
  const numId = typeof id === "number" ? id : Number.parseInt(String(id), 10);
  if (!Number.isFinite(numId) || numId <= 0) return null;
  const name =
    (typeof raw.name === "string" && raw.name.trim()) ||
    (typeof raw.form_name === "string" && raw.form_name.trim()) ||
    (typeof raw.title === "string" && raw.title.trim()) ||
    `#${numId}`;
  return {
    ...raw,
    id: numId,
    name,
    is_active: typeof raw.is_active === "boolean" ? raw.is_active : undefined,
    project_type: (raw.project_type as FormListItem["project_type"]) ?? null,
    created_by: (raw.created_by as FormListItem["created_by"]) ?? null,
    modified_by: (raw.modified_by as FormListItem["modified_by"]) ?? null,
    created_at: typeof raw.created_at === "string" ? raw.created_at : undefined,
    modified_at: typeof raw.modified_at === "string" ? raw.modified_at : null,
  };
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

function isPaginationLike(value: unknown): value is FormsPagination {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.total_records === "number" &&
    typeof v.total_pages === "number" &&
    typeof v.current_page === "number" &&
    typeof v.page_size === "number"
  );
}

export function parseFormsPaginationResponse(data: unknown): FormsPagination {
  if (data && typeof data === "object") {
    const envelope = data as Record<string, unknown>;
    if (isPaginationLike(envelope.pagination)) return envelope.pagination;
    if (typeof envelope.count === "number") {
      return {
        total_records: envelope.count,
        total_pages: typeof envelope.total_pages === "number" ? envelope.total_pages : 1,
        current_page: typeof envelope.current_page === "number" ? envelope.current_page : 1,
        page_size: typeof envelope.page_size === "number" ? envelope.page_size : Math.max(envelope.count, 1),
        next: typeof envelope.next === "string" ? envelope.next : null,
        previous: typeof envelope.previous === "string" ? envelope.previous : null,
      };
    }
  }
  return {
    total_records: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 20,
    next: null,
    previous: null,
  };
}
