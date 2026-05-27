import {
  QUICK_CREATE_SELECT_PARAM,
  QUICK_CREATE_SELECT_TARGET_PARAM,
} from "@/shared/utils/quick-create-navigation.util";

const STORAGE_PREFIX = "onetrace:qc-draft:";

type StoredDraft = {
  savedAt: number;
  values: unknown;
};

/** Stable key for the page the user returns to (strips quick-create selection params). */
export function buildQuickCreateDraftKey(returnTo: string): string {
  const qIndex = returnTo.indexOf("?");
  const path = qIndex >= 0 ? returnTo.slice(0, qIndex) : returnTo;
  const qs = qIndex >= 0 ? returnTo.slice(qIndex + 1) : "";
  const params = new URLSearchParams(qs);
  params.delete(QUICK_CREATE_SELECT_PARAM);
  params.delete(QUICK_CREATE_SELECT_TARGET_PARAM);
  const cleanQs = params.toString();
  return `${STORAGE_PREFIX}${path}${cleanQs ? `?${cleanQs}` : ""}`;
}

export function saveQuickCreateFormDraft(returnTo: string, values: unknown): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const payload: StoredDraft = { savedAt: Date.now(), values };
    sessionStorage.setItem(buildQuickCreateDraftKey(returnTo), JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function loadQuickCreateFormDraft<T>(returnTo: string): T | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(buildQuickCreateDraftKey(returnTo));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    return (parsed?.values ?? null) as T | null;
  } catch {
    return null;
  }
}

export function clearQuickCreateFormDraft(returnTo: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(buildQuickCreateDraftKey(returnTo));
  } catch {
    // ignore
  }
}
