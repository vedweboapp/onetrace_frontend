import type { QuotationDraft } from "@/features/quotations/types/quotation-draft.types";
import type { QuotationScopeNavContext } from "@/features/quotations/utils/quotation-composite-scope-nav.util";

export const QUOTATION_SECTION_SCOPE_SESSION_KEY = "quotation-section-scope-v1";

export type QuotationSectionScopeSession = {
  draft: QuotationDraft;
  sectionId: string;
  backHref: string;
  readOnly: boolean;
  /** Parent Scope & Pricing should apply `draft` when returning. */
  pendingApply: boolean;
};

export function writeQuotationSectionScopeSession(session: QuotationSectionScopeSession): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(QUOTATION_SECTION_SCOPE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore quota / private mode
  }
}

export function readQuotationSectionScopeSession(): QuotationSectionScopeSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(QUOTATION_SECTION_SCOPE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuotationSectionScopeSession;
    if (!parsed?.draft || !Array.isArray(parsed.draft.sections) || typeof parsed.sectionId !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearQuotationSectionScopeSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(QUOTATION_SECTION_SCOPE_SESSION_KEY);
  } catch {
    // ignore
  }
  clearTakenQuotationSectionScopeDraft();
}

export function clearQuotationSectionScopePendingApply(): void {
  const session = readQuotationSectionScopeSession();
  if (!session?.pendingApply) return;
  writeQuotationSectionScopeSession({ ...session, pendingApply: false });
}

/**
 * Survives React Strict Mode remounts in the same navigation tick so a pending
 * section-scope draft is not lost after the first consume.
 */
let takenSectionScopeDraft: QuotationDraft | null = null;
let hasTakenSectionScopeDraft = false;

export function consumeQuotationSectionScopeDraft(): QuotationDraft | null {
  if (hasTakenSectionScopeDraft) return takenSectionScopeDraft;
  const session = readQuotationSectionScopeSession();
  if (!session?.pendingApply) return null;
  writeQuotationSectionScopeSession({ ...session, pendingApply: false });
  hasTakenSectionScopeDraft = true;
  takenSectionScopeDraft = session.draft;
  return session.draft;
}

/** Call after the parent has applied the returned draft into React state. */
export function clearTakenQuotationSectionScopeDraft(): void {
  hasTakenSectionScopeDraft = false;
  takenSectionScopeDraft = null;
}

type SectionScopeHrefParams = {
  sectionId: string;
  backHref?: string;
  quoteCategory?: string;
};

export function buildQuotationSectionScopeHref(
  context: QuotationScopeNavContext,
  params: SectionScopeHrefParams,
): string {
  const base =
    context.mode === "new"
      ? "/quotations/new/section"
      : context.mode === "edit"
        ? `/quotations/${context.quotationId}/edit/section`
        : `/quotations/${context.quotationId}/section`;

  const q = new URLSearchParams();
  q.set("section", params.sectionId);
  if (params.backHref?.trim()) q.set("back", params.backHref.trim());
  if (params.quoteCategory) q.set("quote_category", params.quoteCategory);
  return `${base}?${q.toString()}`;
}
