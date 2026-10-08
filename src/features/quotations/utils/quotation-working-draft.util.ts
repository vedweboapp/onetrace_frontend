import type { QuotationDraft } from "@/features/quotations/types/quotation-draft.types";

const WORKING_DRAFT_KEY_PREFIX = "quotation-working-draft-v1:";
const FORM_VALUES_KEY_PREFIX = "quotation-form-values-v1:";
const FRESH_CREATE_FLAG_KEY = "quotation-fresh-create-v1";

export type QuotationWorkingDraftKey = number | "new";

function storageKey(key: QuotationWorkingDraftKey): string {
  return `${WORKING_DRAFT_KEY_PREFIX}${key === "new" ? "new" : key}`;
}

function formValuesStorageKey(key: QuotationWorkingDraftKey): string {
  return `${FORM_VALUES_KEY_PREFIX}${key === "new" ? "new" : key}`;
}

export function writeQuotationWorkingDraft(key: QuotationWorkingDraftKey, draft: QuotationDraft): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(key), JSON.stringify(draft));
  } catch {
    // ignore quota / private mode
  }
}

export function readQuotationWorkingDraft(key: QuotationWorkingDraftKey): QuotationDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuotationDraft;
    if (!parsed || !Array.isArray(parsed.sections)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearQuotationWorkingDraft(key: QuotationWorkingDraftKey): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(key));
    sessionStorage.removeItem(formValuesStorageKey(key));
  } catch {
    // ignore
  }
}

/** Persist Details/Project form values across Scope & pricing section navigation. */
export function writeQuotationFormValuesDraft(key: QuotationWorkingDraftKey, values: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(formValuesStorageKey(key), JSON.stringify({ savedAt: Date.now(), values }));
  } catch {
    // ignore
  }
}

export function readQuotationFormValuesDraft<T = unknown>(key: QuotationWorkingDraftKey): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(formValuesStorageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { values?: T };
    return (parsed?.values ?? null) as T | null;
  } catch {
    return null;
  }
}

/**
 * Mark the next `/quotations/new` visit as a fresh create so abandoned
 * session drafts (e.g. a leftover section named "A") are not restored.
 */
export function markQuotationFreshCreate(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(FRESH_CREATE_FLAG_KEY, "1");
  } catch {
    // ignore
  }
}

/** Consume the fresh-create flag (one shot). */
export function consumeQuotationFreshCreate(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(FRESH_CREATE_FLAG_KEY);
    if (!raw) return false;
    sessionStorage.removeItem(FRESH_CREATE_FLAG_KEY);
    return true;
  } catch {
    return false;
  }
}
