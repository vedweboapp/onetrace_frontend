import type { QuotationDraft } from "@/features/quotations/types/quotation-draft.types";

const WORKING_DRAFT_KEY_PREFIX = "quotation-working-draft-v1:";

export type QuotationWorkingDraftKey = number | "new";

function storageKey(key: QuotationWorkingDraftKey): string {
  return `${WORKING_DRAFT_KEY_PREFIX}${key === "new" ? "new" : key}`;
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
  } catch {
    // ignore
  }
}
