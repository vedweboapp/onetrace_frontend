import { create } from "zustand";
import type { QuotationFormValues } from "@/features/quotations/schemas/quotation-form-schema";
import type { QuotationDraft } from "@/features/quotations/types/quotation-draft.types";

export type QuotationFormWorkspaceSnapshot = {
  mode: "create" | "edit";
  quotationId: number | null;
  formValues: QuotationFormValues;
  draft: QuotationDraft;
};

type QuotationFormWorkspaceState = {
  snapshot: QuotationFormWorkspaceSnapshot | null;
  saveSnapshot: (snapshot: QuotationFormWorkspaceSnapshot) => void;
  /** Returns and clears snapshot when mode/id match (returning from block detail). */
  takeSnapshot: (mode: "create" | "edit", quotationId: number | null) => QuotationFormWorkspaceSnapshot | null;
  clearSnapshot: () => void;
};

export const useQuotationFormWorkspaceStore = create<QuotationFormWorkspaceState>((set, get) => ({
  snapshot: null,
  saveSnapshot: (snapshot) => set({ snapshot }),
  takeSnapshot: (mode, quotationId) => {
    const current = get().snapshot;
    if (!current) return null;
    if (current.mode !== mode) return null;
    if ((current.quotationId ?? null) !== (quotationId ?? null)) return null;
    set({ snapshot: null });
    return current;
  },
  clearSnapshot: () => set({ snapshot: null }),
}));
