"use client";

import { updateQuotationAttachments } from "@/features/quotations/api/quotation.api";
import type { QuotationDetail } from "@/features/quotations/types/quotation.types";
import { EntityAttachmentsTab } from "@/shared/attachments/entity-attachments-tab";

export type QuotationAttachmentsTabProps = {
  detail: QuotationDetail;
  onSaved: () => void | Promise<void>;
};

/** Quotation attachments — same shared UX as client/vendor/job/project. */
export function QuotationAttachmentsTab({ detail, onSaved }: QuotationAttachmentsTabProps) {
  return (
    <EntityAttachmentsTab
      entityId={detail.id}
      attachments={detail.attachments}
      emptyIconName="quotations"
      updateAttachments={(refs) => updateQuotationAttachments(detail.id, refs)}
      onSaved={onSaved}
    />
  );
}
