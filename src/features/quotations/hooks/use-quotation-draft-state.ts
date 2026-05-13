"use client";

import * as React from "react";
import type { ProjectLevelForQuotation, QuotationQuoteSection } from "@/features/quotations/types/quotation.types";
import type { QuotationDraft } from "@/features/quotations/types/quotation-draft.types";
import { seedDraftFromQuoteSections, seedDraftFromSortedLevels } from "@/features/quotations/utils/quotation-draft-seed.util";

export type QuotationEditDraftSeed = {
  quotationId: number;
  quoteSections: QuotationQuoteSection[];
};

/**
 * Seeds quotation draft from project levels (create) or from persisted `quote_sections` (edit).
 * Edit with non-empty `quote_sections` wins over level rows and is not overwritten when levels load.
 */
export function useQuotationDraftState(
  enabled: boolean,
  projectId: number | undefined,
  sortedLevelRows: ProjectLevelForQuotation[],
  editSeed: QuotationEditDraftSeed | null = null,
): [QuotationDraft | null, React.Dispatch<React.SetStateAction<QuotationDraft | null>>] {
  const [draft, setDraft] = React.useState<QuotationDraft | null>(null);
  const seededProjectRef = React.useRef<number | null>(null);
  const hadRowsRef = React.useRef(false);
  const editSeededForQuotationRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const queueDraft = (next: QuotationDraft | null) => {
      queueMicrotask(() => setDraft(next));
    };

    if (!enabled) {
      seededProjectRef.current = null;
      hadRowsRef.current = false;
      editSeededForQuotationRef.current = null;
      queueDraft(null);
      return;
    }

    const es = editSeed;
    const preferEditSections =
      es != null && es.quotationId > 0 && Array.isArray(es.quoteSections) && es.quoteSections.length > 0;

    if (preferEditSections) {
      if (editSeededForQuotationRef.current !== es.quotationId) {
        editSeededForQuotationRef.current = es.quotationId;
        seededProjectRef.current = null;
        hadRowsRef.current = false;
        queueDraft(seedDraftFromQuoteSections(es.quoteSections));
      }
      return;
    }

    if (editSeed != null && editSeed.quotationId > 0) {
      editSeededForQuotationRef.current = editSeed.quotationId;
    } else {
      editSeededForQuotationRef.current = null;
    }

    const pid = projectId && projectId > 0 ? projectId : null;
    if (pid == null) {
      seededProjectRef.current = null;
      hadRowsRef.current = false;
      queueDraft(null);
      return;
    }

    const hasRows = sortedLevelRows.length > 0;

    if (seededProjectRef.current !== pid) {
      seededProjectRef.current = pid;
      hadRowsRef.current = hasRows;
      queueDraft(seedDraftFromSortedLevels(sortedLevelRows));
      return;
    }

    if (!hadRowsRef.current && hasRows) {
      hadRowsRef.current = true;
      queueDraft(seedDraftFromSortedLevels(sortedLevelRows));
    }
  }, [enabled, projectId, sortedLevelRows, editSeed]);

  return [draft, setDraft];
}
